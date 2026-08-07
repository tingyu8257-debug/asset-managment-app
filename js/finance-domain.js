(function (root) {
  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function round(value) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  function getExchangeRate(currency, exchangeRates) {
    if (currency === "TWD") return 1;
    const rate = Number(exchangeRates?.[currency]);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  }

  function convertToBaseCurrency(amount, currency, exchangeRates) {
    const rate = getExchangeRate(currency, exchangeRates);
    return Number.isFinite(amount) && rate ? round(amount * rate) : null;
  }

  function formatMoney(amount, currency) {
    if (!Number.isFinite(amount) || !currency) return "尚未設定";
    const digits = currency === "TWD" || currency === "JPY" ? 0 : 2;
    return `${currency} ${amount.toLocaleString("zh-TW", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  }

  // 簡化平均成本法：未包含手續費、稅、股利與精準匯率損益。
  function calculatePositionFinancials(transactions, currentPrice, currency, exchangeRates) {
    let shares = 0;
    let totalCostLocal = 0;
    let realizedProfitLossLocal = 0;
    let realizedProfitLossBase = 0;
    let investedCostLocal = 0;
    let investedCostBase = 0;
    let lastTransactionDate = "";
    const transactionResults = {};
    const sorted = transactions.filter((item) => !item.isDeleted)
      .sort((a, b) => `${a.date}-${a.createdAt || a.id}`.localeCompare(`${b.date}-${b.createdAt || b.id}`));

    sorted.forEach((transaction) => {
      const amount = safeNumber(transaction.shares);
      const price = safeNumber(transaction.price);
      const averageCostBefore = shares > 0 ? totalCostLocal / shares : 0;
      let realizedLocal = null;
      let realizedBase = null;
      let realizedReturnPercent = null;
      if (transaction.type === "buy" || transaction.type === "add") {
        shares += amount;
        totalCostLocal += amount * price;
        investedCostLocal += amount * price;
        const tradeRate = safeNumber(transaction.exchangeRate ?? transaction.fxRateAtTrade, 0);
        if (tradeRate > 0) investedCostBase += amount * price * tradeRate;
      } else {
        const removed = Math.min(amount, shares);
        realizedLocal = (price - averageCostBefore) * removed;
        const tradeRate = safeNumber(transaction.exchangeRate ?? transaction.fxRateAtTrade, 0);
        realizedBase = tradeRate > 0 ? realizedLocal * tradeRate : null;
        realizedReturnPercent = averageCostBefore > 0 ? realizedLocal / (averageCostBefore * removed) * 100 : null;
        shares -= removed;
        totalCostLocal -= averageCostBefore * removed;
        realizedProfitLossLocal += realizedLocal;
        if (realizedBase !== null) realizedProfitLossBase += realizedBase;
      }
      if (shares < 0.000001) { shares = 0; totalCostLocal = 0; }
      lastTransactionDate = transaction.date || lastTransactionDate;
      transactionResults[transaction.id] = { realizedProfitLossLocal: realizedLocal === null ? null : round(realizedLocal), realizedProfitLossBase: realizedBase === null ? null : round(realizedBase), realizedReturnPercent: realizedReturnPercent === null ? null : round(realizedReturnPercent) };
    });

    const rate = getExchangeRate(currency, exchangeRates);
    const price = Number(currentPrice);
    const hasPrice = Number.isFinite(price) && price > 0;
    const averageCostLocal = shares > 0 ? totalCostLocal / shares : 0;
    const marketValueLocal = hasPrice ? shares * price : null;
    const unrealizedProfitLossLocal = marketValueLocal === null ? null : marketValueLocal - totalCostLocal;
    return {
      shares: round(shares), averageCostLocal: round(averageCostLocal), totalCostLocal: round(totalCostLocal), currentPriceLocal: hasPrice ? price : null,
      marketValueLocal: marketValueLocal === null ? null : round(marketValueLocal), unrealizedProfitLossLocal: unrealizedProfitLossLocal === null ? null : round(unrealizedProfitLossLocal),
      unrealizedReturnPercent: totalCostLocal > 0 && unrealizedProfitLossLocal !== null ? round(unrealizedProfitLossLocal / totalCostLocal * 100) : null,
      totalCostBase: rate ? round(totalCostLocal * rate) : null, marketValueBase: marketValueLocal !== null && rate ? round(marketValueLocal * rate) : null,
      unrealizedProfitLossBase: unrealizedProfitLossLocal !== null && rate ? round(unrealizedProfitLossLocal * rate) : null,
      realizedProfitLossLocal: round(realizedProfitLossLocal), realizedProfitLossBase: round(realizedProfitLossBase), lastTransactionDate, transactionResults
      ,investedCostLocal: round(investedCostLocal), investedCostBase: round(investedCostBase)
    };
  }

  root.FinanceDomain = { safeNumber, getExchangeRate, convertToBaseCurrency, formatMoney, calculatePositionFinancials };
})(typeof window !== "undefined" ? window : globalThis);
