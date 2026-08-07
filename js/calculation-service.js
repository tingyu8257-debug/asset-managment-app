(typeof window !== "undefined" ? window : globalThis).CalculationService = (() => {
  function create({ state, getAllCalculatedPositions, getStock }) {
    const constants = window.AppConstants;
    const core = window.AssetCalculationCore;
    let cache = null;

    function getLatestBalance(accountId) {
      return core.pickLatestByDate((state.accountBalances || []).filter((balance) => balance.accountId === accountId), "balanceDate");
    }

    function activeAccounts() {
      return (state.financialAccounts || []).filter((account) => !account.isArchived);
    }

    function activePolicies() {
      return (state.insurancePolicies || []).filter((policy) => policy.includeInNetWorth && !policy.isArchived);
    }

    function activeLiabilities() {
      return (state.liabilities || []).filter((liability) => !liability.isArchived && liability.status !== "paidOff" && core.numberOrZero(liability.currentBalance) > 0);
    }

    function calculateCash() {
      const items = activeAccounts().map((account) => {
        const latestBalance = getLatestBalance(account.id);
        const valueTwd = latestBalance ? core.toDashboardCurrency(latestBalance.amount, account.currency, account) : 0;
        return { account, latestBalance, valueTwd: valueTwd ?? 0, isMissingFx: valueTwd === null };
      });
      return { total: core.round(items.reduce((sum, item) => sum + core.numberOrZero(item.valueTwd), 0)), items };
    }

    function calculateInvestments() {
      const savedPositions = new Map((state.positions || []).map((position) => [position.stockId, position]));
      const items = getAllCalculatedPositions().map((position) => {
        const savedPosition = savedPositions.get(position.stockId) || {};
        return { position, savedPosition, stock: getStock(position.stockId) };
      }).filter(({ position, savedPosition }) => !savedPosition.isArchived && core.numberOrZero(position.shares) > 0);
      return { total: core.round(items.reduce((sum, item) => sum + core.numberOrZero(item.position.marketValueBase), 0)), items };
    }

    function calculateInsurance() {
      const items = activePolicies().map((policy) => {
        const valueTwd = core.toDashboardCurrency(policy.currentCashValue, policy.cashValueCurrency, policy);
        return { policy, valueTwd: valueTwd ?? 0, isMissingFx: valueTwd === null };
      });
      return { total: core.round(items.reduce((sum, item) => sum + core.numberOrZero(item.valueTwd), 0)), items };
    }

    function calculateLiabilities() {
      const items = activeLiabilities().map((liability) => {
        const valueTwd = core.toDashboardCurrency(liability.currentBalance, liability.currency, liability);
        return { liability, valueTwd: valueTwd ?? 0, isMissingFx: valueTwd === null };
      });
      return { total: core.round(items.reduce((sum, item) => sum + core.numberOrZero(item.valueTwd), 0)), items };
    }

    function calculateAssets() {
      const cash = calculateCash();
      const investments = calculateInvestments();
      const insurance = calculateInsurance();
      return { total: core.round(cash.total + investments.total + insurance.total), cash, investments, insurance };
    }

    function calculateNetWorth() {
      const assets = calculateAssets();
      const liabilities = calculateLiabilities();
      return { total: core.round(assets.total - liabilities.total), assets, liabilities };
    }

    function calculateAllocation() {
      const assets = calculateAssets();
      return {
        totalAssets: assets.total,
        cashPercent: core.percentOfTotal(assets.cash.total, assets.total),
        investmentPercent: core.percentOfTotal(assets.investments.total, assets.total),
        insurancePercent: core.percentOfTotal(assets.insurance.total, assets.total)
      };
    }

    function addWarning(warnings, sourceType, sourceName, message) {
      warnings.push({ sourceType, sourceName: sourceName || constants.UNKNOWN_TEXT, message });
    }

    function getWarnings() {
      const warnings = [];
      activeAccounts().forEach((account) => {
        if (!core.isSupportedCurrency(account.currency)) addWarning(warnings, "Financial Account", account.name, "Currency 只能是 TWD 或 USD。");
        if (!getLatestBalance(account.id)) addWarning(warnings, "Financial Account", account.name, "沒有 Balance。");
        if (account.currency === "USD" && !core.currentFxFor(account, account.currency)) addWarning(warnings, "Financial Account", account.name, "USD Account 沒有 Current FX。");
      });
      (state.insurancePolicies || []).filter((policy) => !policy.isArchived).forEach((policy) => {
        if (!core.isSupportedCurrency(policy.cashValueCurrency)) addWarning(warnings, "Insurance", policy.name, "Currency 只能是 TWD 或 USD。");
        if (policy.includeInNetWorth && core.numberOrZero(policy.currentCashValue) === 0) addWarning(warnings, "Insurance", policy.name, "沒有 Current Cash Value。");
        if (policy.includeInNetWorth && policy.cashValueCurrency === "USD" && !core.currentFxFor(policy, policy.cashValueCurrency)) addWarning(warnings, "Insurance", policy.name, "USD Insurance 沒有 Current FX。");
      });
      (state.liabilities || []).filter((liability) => !liability.isArchived && liability.status !== "paidOff").forEach((liability) => {
        if (!core.isSupportedCurrency(liability.currency)) addWarning(warnings, "Liability", liability.name, "Currency 只能是 TWD 或 USD。");
        if (!Number.isFinite(Number(liability.currentBalance)) || Number(liability.currentBalance) < 0) addWarning(warnings, "Liability", liability.name, "Current Balance 無效。");
        if (liability.currency === "USD" && !core.currentFxFor(liability, liability.currency)) addWarning(warnings, "Liability", liability.name, "USD Liability 沒有 Current FX。");
      });
      const savedPositions = new Map((state.positions || []).map((position) => [position.stockId, position]));
      getAllCalculatedPositions().forEach((position) => {
        const savedPosition = savedPositions.get(position.stockId) || {};
        const stock = getStock(position.stockId);
        const name = stock ? `${stock.ticker} ${stock.companyName}` : position.stockId;
        const shares = Number(position.shares);
        const marketValue = Number(position.marketValueBase);
        if (!Number.isFinite(shares) || shares < 0) addWarning(warnings, "Position", name, "Quantity 無效。");
        else if (shares === 0) addWarning(warnings, "Position", name, "Quantity=0。");
        if (shares > 0 && (!Number.isFinite(marketValue) || marketValue < 0)) addWarning(warnings, "Position", name, "Market Value 無效。");
        if (position.currency === "USD" && !core.currentFxFor(savedPosition, position.currency)) addWarning(warnings, "Position", name, "Position Current FX 無效。");
      });
      return warnings;
    }
    function makeActivity(type, title, updatedAt, detail = "") {
      return { type, title, updatedAt: updatedAt || "", detail };
    }

    function getLatestActivity() {
      const activities = [];
      (state.transactions || []).filter((item) => !item.isDeleted).forEach((transaction) => {
        const stock = getStock(transaction.stockId);
        const verb = { buy: "Bought", add: "Added", reduce: "Sold", exit: "Exited" }[transaction.type] || "Updated";
        activities.push(makeActivity("Transaction", `${verb} ${stock?.ticker || transaction.ticker || constants.UNKNOWN_TEXT}`, transaction.updatedAt || transaction.createdAt || transaction.date, transaction.reason));
      });
      (state.accountBalances || []).forEach((balance) => {
        const account = (state.financialAccounts || []).find((item) => item.id === balance.accountId);
        activities.push(makeActivity("Balance", `Updated ${account?.name || constants.UNKNOWN_TEXT} Balance`, balance.updatedAt || balance.createdAt || balance.balanceDate, balance.note));
      });
      (state.cashFlowEntries || []).forEach((entry) => {
        const verb = { income: "Income", expense: "Expense", transfer: "Transfer" }[entry.type] || "Cash Flow";
        activities.push(makeActivity("Cash Flow", `${verb}: ${entry.title || entry.note || constants.UNKNOWN_TEXT}`, entry.updatedAt || entry.createdAt || entry.date, `${entry.currency} ${entry.amount}`));
      });
      (state.financialAccounts || []).forEach((account) => activities.push(makeActivity("Financial Account", `Updated ${account.name}`, account.updatedAt || account.createdAt, account.institution)));
      (state.insurancePolicies || []).forEach((policy) => activities.push(makeActivity("Insurance", `Insurance Updated: ${policy.name}`, policy.updatedAt || policy.createdAt || policy.cashValueDate, policy.insurer)));
      (state.liabilities || []).forEach((liability) => activities.push(makeActivity("Liability", `Liability Updated: ${liability.name}`, liability.updatedAt || liability.createdAt, liability.lender)));
      (state.positions || []).forEach((position) => {
        const stock = getStock(position.stockId);
        activities.push(makeActivity("Position", `Position Updated: ${stock?.ticker || position.stockId}`, position.updatedAt || position.createdAt, stock?.companyName));
      });
      return activities
        .filter((activity) => activity.updatedAt)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, constants.ACTIVITY_LIMIT);
    }

    function getDashboardSummary() {
      if (cache) return cache;
      const netWorth = calculateNetWorth();
      cache = {
        netWorth,
        assets: netWorth.assets,
        liabilities: netWorth.liabilities,
        allocation: calculateAllocation(),
        warnings: getWarnings(),
        latestActivity: getLatestActivity()
      };
      return cache;
    }

    function invalidate() {
      cache = null;
    }

    return {
      calculateCash,
      calculateInvestments,
      calculateInsurance,
      calculateLiabilities,
      calculateAssets,
      calculateNetWorth,
      calculateAllocation,
      getWarnings,
      getLatestActivity,
      getDashboardSummary,
      invalidate
    };
  }

  return { create };
})();

