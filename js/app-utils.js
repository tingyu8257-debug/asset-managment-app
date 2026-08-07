window.AppUtils = (() => {
  const byId = (id) => document.getElementById(id);

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function round(value) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  function createFormatters(state) {
    return {
      formatMoney(value, currency = state.settings.baseCurrency) {
        return window.AppFormatters.formatCurrency(value, currency);
      },
      formatPrice(value) {
        return Number.isFinite(value) && value > 0 ? window.AppFormatters.formatNumber(value, 2) : "尚未設定";
      },
      formatPercent(value) {
        return window.AppFormatters.formatPercentage(value);
      }
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return { byId, safeNumber, round, createFormatters, escapeHtml, today };
})();
