(typeof window !== "undefined" ? window : globalThis).NetWorthSelectors = (() => {
  function create({ state, getAllCalculatedPositions }) {
    const core = window.AssetCalculationCore;

    function getBaseCurrency() {
      return "TWD";
    }

    function getExchangeRate(currency, source = {}) {
      if (!currency || currency === "TWD") return 1;
      if (currency !== "USD") return null;
      const manualRate = Number(source.currentFx || source.currentFxRate || source.fxRate);
      return Number.isFinite(manualRate) && manualRate > 0 ? manualRate : null;
    }

    function toBaseCurrency(amount, currency, source = {}) {
      const cleanAmount = core.numberOrZero(amount);
      const rate = getExchangeRate(currency, source);
      return rate ? core.round(cleanAmount * rate) : null;
    }

    function getActiveAccounts() {
      return (state.financialAccounts || []).filter((account) => !account.isArchived);
    }

    function getLatestBalanceForAccount(accountId) {
      return core.pickLatestByDate(
        (state.accountBalances || []).filter((balance) => balance.accountId === accountId),
        "balanceDate"
      );
    }

    function getCashBreakdown() {
      return getActiveAccounts().map((account) => {
        const latestBalance = getLatestBalanceForAccount(account.id);
        const amountBase = latestBalance ? toBaseCurrency(latestBalance.amount, account.currency, account) : 0;
        return {
          account,
          latestBalance,
          amountBase: amountBase ?? 0,
          missingFx: amountBase === null
        };
      });
    }

    function getInvestmentBreakdown() {
      const positionsByStockId = new Map((state.positions || []).map((position) => [position.stockId, position]));
      return getAllCalculatedPositions()
        .filter((position) => {
          const savedPosition = positionsByStockId.get(position.stockId) || {};
          return !savedPosition.isArchived && core.numberOrZero(position.shares) > 0;
        })
        .map((position) => ({
          position,
          amountBase: core.numberOrZero(position.marketValueBase)
        }));
    }

    function getInsuranceBreakdown() {
      return (state.insurancePolicies || [])
        .filter((policy) => policy.includeInNetWorth && !policy.isArchived)
        .map((policy) => {
          const amountBase = toBaseCurrency(policy.currentCashValue, policy.cashValueCurrency, policy);
          return {
            policy,
            amountBase: amountBase ?? 0,
            missingFx: amountBase === null
          };
        });
    }

    function getLiabilityBreakdown() {
      return (state.liabilities || [])
        .filter((liability) => !liability.isArchived && liability.status !== "paidOff" && core.numberOrZero(liability.currentBalance) > 0)
        .map((liability) => {
          const amountBase = toBaseCurrency(liability.currentBalance, liability.currency, liability);
          return {
            liability,
            amountBase: amountBase ?? 0,
            missingFx: amountBase === null
          };
        });
    }

    function sumBase(items) {
      return core.round(items.reduce((sum, item) => sum + core.numberOrZero(item.amountBase), 0));
    }

    function latestDate(values) {
      const timestamps = values
        .filter(Boolean)
        .map((value) => Date.parse(value))
        .filter(Number.isFinite);
      if (!timestamps.length) return "";
      return new Date(Math.max(...timestamps)).toISOString();
    }

    function getLatestUpdatedAt() {
      const accountTimes = getActiveAccounts().flatMap((account) => {
        const balance = getLatestBalanceForAccount(account.id);
        return [account.updatedAt, account.createdAt, balance?.updatedAt, balance?.createdAt, balance?.balanceDate];
      });
      const activePositionStockIds = new Set(getInvestmentBreakdown().map((item) => item.position.stockId));
      const positionTimes = [
        ...(state.positions || [])
          .filter((position) => activePositionStockIds.has(position.stockId))
          .flatMap((position) => [position.updatedAt, position.createdAt]),
        ...(state.transactions || [])
          .filter((transaction) => activePositionStockIds.has(transaction.stockId) && !transaction.isDeleted)
          .flatMap((transaction) => [transaction.updatedAt, transaction.createdAt, transaction.date])
      ];
      const insuranceTimes = (state.insurancePolicies || [])
        .filter((policy) => policy.includeInNetWorth && !policy.isArchived)
        .flatMap((policy) => [policy.updatedAt, policy.createdAt, policy.cashValueDate]);
      const liabilityTimes = (state.liabilities || [])
        .filter((liability) => !liability.isArchived && liability.status !== "paidOff" && core.numberOrZero(liability.currentBalance) > 0)
        .flatMap((liability) => [liability.updatedAt, liability.createdAt]);
      return latestDate([...accountTimes, ...positionTimes, ...insuranceTimes, ...liabilityTimes]);
    }

    function getNetWorthSummary() {
      const cashBreakdown = getCashBreakdown();
      const investmentBreakdown = getInvestmentBreakdown();
      const insuranceBreakdown = getInsuranceBreakdown();
      const liabilityBreakdown = getLiabilityBreakdown();

      const cashBase = sumBase(cashBreakdown);
      const investmentsBase = sumBase(investmentBreakdown);
      const insuranceCashValueBase = sumBase(insuranceBreakdown);
      const totalAssetsBase = core.round(cashBase + investmentsBase + insuranceCashValueBase);
      const totalLiabilitiesBase = sumBase(liabilityBreakdown);
      const netWorthBase = core.round(totalAssetsBase - totalLiabilitiesBase);

      return {
        baseCurrency: getBaseCurrency(),
        cashBase,
        investmentsBase,
        insuranceCashValueBase,
        totalAssetsBase,
        totalLiabilitiesBase,
        netWorthBase,
        allocation: {
          cashPercent: core.percentOfTotal(cashBase, totalAssetsBase),
          investmentPercent: core.percentOfTotal(investmentsBase, totalAssetsBase),
          insurancePercent: core.percentOfTotal(insuranceCashValueBase, totalAssetsBase)
        },
        latestUpdatedAt: getLatestUpdatedAt(),
        cashBreakdown,
        investmentBreakdown,
        insuranceBreakdown,
        liabilityBreakdown,
        missingFxItems: [...cashBreakdown, ...insuranceBreakdown, ...liabilityBreakdown].filter((item) => item.missingFx)
      };
    }

    return {
      getNetWorthSummary,
      getLatestBalanceForAccount
    };
  }

  return { create };
})();
