window.PortfolioSelectors = (() => {
  function create({ state, formatPercent }) {
    function getStock(stockId) {
      return state.watchlistStocks.find((stock) => stock.id === stockId);
    }

    function getTransactions(stockId, includeDeleted = false) {
      return state.transactions
        .filter((transaction) => transaction.stockId === stockId && (includeDeleted || !transaction.isDeleted))
        .sort((a, b) => `${a.date}-${a.createdAt || ""}`.localeCompare(`${b.date}-${b.createdAt || ""}`));
    }

    function validateAndNormalizeTransactions(transactions) {
      let shares = 0;
      const normalized = transactions.map((transaction) => ({ ...transaction }))
        .filter((transaction) => !transaction.isDeleted)
        .sort((a, b) => `${a.date}-${a.createdAt || a.id}`.localeCompare(`${b.date}-${b.createdAt || b.id}`));
      for (const transaction of normalized) {
        if (transaction.type === "exit") transaction.shares = shares;
        const amount = Number(transaction.shares);
        if (transaction.type === "buy" || transaction.type === "add") shares += amount;
        else shares -= amount;
      }
      const validation = window.PositionMath.validateTransactionSequence(normalized);
      return { ...validation, normalized };
    }

    function calculatePosition(stockId) {
      const stock = getStock(stockId);
      const savedPosition = state.positions.find((position) => position.stockId === stockId) || {};
      const currency = savedPosition.currency || stock?.currency || state.settings.baseCurrency;
      const currentFx = currency === "TWD" ? 1 : Number(savedPosition.currentFx);
      const positionExchangeRates = { TWD: 1, USD: Number.isFinite(currentFx) && currentFx > 0 ? currentFx : null };
      const calculated = window.FinanceDomain.calculatePositionFinancials(
        getTransactions(stockId),
        savedPosition.currentPrice,
        currency,
        positionExchangeRates
      );
      return {
        stockId,
        currency,
        ...calculated,
        averageCost: calculated.averageCostLocal,
        totalCost: calculated.totalCostLocal,
        currentPrice: calculated.currentPriceLocal,
        currentFx: currentFx || null,
        marketValue: calculated.marketValueBase,
        unrealizedProfitLoss: calculated.unrealizedProfitLossBase,
        status: calculated.shares > 0 ? "持有中" : "已退出"
      };
    }

    function getAllCalculatedPositions() {
      const ids = new Set([
        ...state.positions.filter((position) => !position.isArchived).map((position) => position.stockId),
        ...state.transactions.filter((transaction) => !transaction.isDeleted).map((transaction) => transaction.stockId)
      ]);
      return [...ids].filter(getStock).map(calculatePosition);
    }

    function getPortfolioSummary() {
      const settings = state.settings;
      const positions = getAllCalculatedPositions();
      const activePositions = positions.filter((position) => position.shares > 0);
      const investedCost = positions.reduce((sum, position) => sum + (position.investedCostBase || 0), 0);
      const satelliteMarketValue = activePositions.reduce((sum, position) => sum + (position.marketValueBase || 0), 0);
      const unrealizedProfitLossBase = activePositions.reduce((sum, position) => sum + (position.unrealizedProfitLossBase || 0), 0);
      const realizedProfitLossBase = positions.reduce((sum, position) => sum + (position.realizedProfitLossBase || 0), 0);
      const totalProfitLossBase = unrealizedProfitLossBase + realizedProfitLossBase;
      const totalReturnPercent = investedCost > 0 ? totalProfitLossBase / investedCost * 100 : null;
      const satelliteLimit = window.AppUtils.safeNumber(settings.totalPortfolioValue) * window.AppUtils.safeNumber(settings.satelliteTargetPercent) / 100;
      const availableAmount = Math.max(0, satelliteLimit - satelliteMarketValue);
      const satellitePercent = settings.totalPortfolioValue > 0 ? satelliteMarketValue / settings.totalPortfolioValue * 100 : null;
      const corePercent = settings.totalPortfolioValue > 0 ? settings.coreValue / settings.totalPortfolioValue * 100 : null;
      const uninvested = Math.max(0, settings.totalPortfolioValue - settings.coreValue - satelliteMarketValue);
      const uninvestedPercent = settings.totalPortfolioValue > 0 ? uninvested / settings.totalPortfolioValue * 100 : null;
      return { positions, activePositions, investedCost, satelliteMarketValue, unrealizedProfitLossBase, realizedProfitLossBase, totalProfitLossBase, totalReturnPercent, satelliteLimit, availableAmount, satellitePercent, corePercent, uninvested, uninvestedPercent };
    }

    function getAlerts(summary) {
      const alerts = [];
      const themeValues = {};
      const satelliteValue = summary.satelliteMarketValue;
      const totalValue = window.AppUtils.safeNumber(state.settings.totalPortfolioValue);

      summary.activePositions.forEach((position) => {
        const stock = getStock(position.stockId);
        const satelliteWeight = satelliteValue > 0 ? position.marketValue / satelliteValue * 100 : 0;
        const totalWeight = totalValue > 0 ? position.marketValue / totalValue * 100 : 0;
        if (satelliteWeight > state.settings.maxSingleStockSatellitePercent) alerts.push(`${stock.ticker} 占 Satellite ${formatPercent(satelliteWeight)}，集中度偏高`);
        if (totalWeight > state.settings.maxSingleStockTotalPercent) alerts.push(`${stock.ticker} 占總資產 ${formatPercent(totalWeight)}，需要重新檢查`);
        stock.tags.forEach((tag) => { themeValues[tag] = (themeValues[tag] || 0) + (position.marketValue || 0); });
      });

      Object.entries(themeValues).forEach(([tag, value]) => {
        const weight = satelliteValue > 0 ? value / satelliteValue * 100 : 0;
        if (weight > state.settings.maxThemeSatellitePercent) alerts.push(`${tag} 題材占 Satellite ${formatPercent(weight)}，集中度偏高`);
      });
      if (summary.satellitePercent !== null && summary.satellitePercent > state.settings.satelliteTargetPercent) alerts.push(`Satellite 整體已超過 ${formatPercent(state.settings.satelliteTargetPercent)} 上限，需要重新檢查`);
      return alerts;
    }

    return {
      getStock,
      getTransactions,
      validateAndNormalizeTransactions,
      calculatePosition,
      getAllCalculatedPositions,
      getPortfolioSummary,
      getAlerts
    };
  }

  return { create };
})();
