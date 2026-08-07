(function (root) {
  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function round(value) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  // 逐筆交易計算持股。減碼時以原平均成本扣除，不改變剩餘平均成本。
  function calculatePositionFromTransactions(transactions) {
    let shares = 0;
    let totalCost = 0;
    let lastTransactionDate = "";

    transactions.filter((transaction) => !transaction.isDeleted).forEach((transaction) => {
      const transactionShares = safeNumber(transaction.shares);
      const price = safeNumber(transaction.price);
      lastTransactionDate = transaction.date || lastTransactionDate;

      if (transaction.type === "buy" || transaction.type === "add") {
        shares += transactionShares;
        totalCost += transactionShares * price;
      } else if (transaction.type === "reduce" || transaction.type === "exit") {
        const sharesToRemove = Math.min(transactionShares, shares);
        const averageCost = shares > 0 ? totalCost / shares : 0;
        shares -= sharesToRemove;
        totalCost -= sharesToRemove * averageCost;
      }
    });

    if (shares < 0.000001) {
      shares = 0;
      totalCost = 0;
    }

    return {
      shares: round(shares),
      totalCost: round(totalCost),
      averageCost: shares > 0 ? round(totalCost / shares) : 0,
      lastTransactionDate
    };
  }

  // 驗證整串交易，不允許先賣後買、超額減碼或無效數字。
  function validateTransactionSequence(transactions) {
    let shares = 0;
    const sorted = transactions.filter((transaction) => !transaction.isDeleted)
      .sort((a, b) => `${a.date}-${a.createdAt || a.id}`.localeCompare(`${b.date}-${b.createdAt || b.id}`));
    for (const transaction of sorted) {
      const amount = Number(transaction.shares);
      const price = Number(transaction.price);
      if (!transaction.date) return { valid: false, message: "日期不得為空。" };
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) return { valid: false, message: "股數與價格必須大於 0。" };
      if (transaction.type === "buy") {
        if (shares > 0) return { valid: false, message: "已有持股時不能再次使用初始建立部位。" };
        shares += amount;
      } else if (transaction.type === "add") {
        if (shares <= 0) return { valid: false, message: "尚未持有時不能加碼。" };
        shares += amount;
      } else if (transaction.type === "reduce") {
        if (amount > shares) return { valid: false, message: "減碼股數不得超過當時持股。" };
        shares -= amount;
      } else if (transaction.type === "exit") {
        if (shares <= 0 || Math.abs(amount - shares) > 0.0001) return { valid: false, message: "完全退出股數必須等於當時全部持股。" };
        shares = 0;
      } else {
        return { valid: false, message: "交易類型無效。" };
      }
    }
    return { valid: true, shares: round(shares) };
  }

  root.PositionMath = { calculatePositionFromTransactions, validateTransactionSequence };
})(typeof window !== "undefined" ? window : globalThis);
