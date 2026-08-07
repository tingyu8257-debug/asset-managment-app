(typeof window !== "undefined" ? window : globalThis).AppFormatters = (() => {
  const constants = (typeof window !== "undefined" ? window : globalThis).AppConstants || {};
  const UNKNOWN_TEXT = constants.UNKNOWN_TEXT || "尚未設定";

  function formatCurrency(value, currency = constants.DASHBOARD_CURRENCY || "TWD") {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return UNKNOWN_TEXT;
    const normalizedCurrency = currency === "USD" ? "USD" : "TWD";
    const digits = normalizedCurrency === "USD" ? 2 : 0;
    const prefix = normalizedCurrency === "USD" ? "US$" : "NT$";
    return `${prefix}${amount.toLocaleString("zh-TW", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })}`;
  }

  function formatPercentage(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return UNKNOWN_TEXT;
    return `${number.toFixed(1)}%`;
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return UNKNOWN_TEXT;
    return date.toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return UNKNOWN_TEXT;
    return number.toLocaleString("zh-TW", { maximumFractionDigits });
  }

  return { formatCurrency, formatPercentage, formatDate, formatNumber };
})();
