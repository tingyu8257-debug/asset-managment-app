(typeof window !== "undefined" ? window : globalThis).AssetCalculationCore = (() => {
  const constants = (typeof window !== "undefined" ? window : globalThis).AppConstants || {};
  const DASHBOARD_CURRENCY = constants.DASHBOARD_CURRENCY || "TWD";
  const SUPPORTED_CURRENCIES = constants.SUPPORTED_CURRENCIES || ["TWD", "USD"];

  function round(value) {
    return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
  }

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function isSupportedCurrency(currency) {
    return SUPPORTED_CURRENCIES.includes(currency);
  }

  function currentFxFor(source, currency) {
    if (!currency || currency === DASHBOARD_CURRENCY) return 1;
    if (currency !== "USD") return null;
    const currentFx = Number(source?.currentFx || source?.currentFxRate || source?.fxRate);
    return Number.isFinite(currentFx) && currentFx > 0 ? currentFx : null;
  }

  function toDashboardCurrency(amount, currency, source = {}) {
    const cleanAmount = numberOrZero(amount);
    const currentFx = currentFxFor(source, currency);
    return currentFx ? round(cleanAmount * currentFx) : null;
  }

  function pickLatestByDate(items, dateKey) {
    return [...items].sort((a, b) => {
      const left = `${b[dateKey] || ""}-${b.updatedAt || ""}-${b.createdAt || ""}-${b.id || ""}`;
      const right = `${a[dateKey] || ""}-${a.updatedAt || ""}-${a.createdAt || ""}-${a.id || ""}`;
      return left.localeCompare(right);
    })[0] || null;
  }

  function percentOfTotal(value, total) {
    return total > 0 ? round(numberOrZero(value) / total * 100) : 0;
  }

  return {
    round,
    numberOrZero,
    isSupportedCurrency,
    currentFxFor,
    toDashboardCurrency,
    pickLatestByDate,
    percentOfTotal
  };
})();
