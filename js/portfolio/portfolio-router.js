window.PortfolioRouter = (() => {
  const ROUTE_ALIASES = {
    "stocks-watchlist": "watchlist",
    "portfolio-stocks-watchlist": "watchlist",
    "stocks-positions": "positions",
    "portfolio-stocks-positions": "positions",
    "stocks-research": "research-dashboard",
    "portfolio-stocks-research": "research-dashboard",
    "research": "research-dashboard",
    "research-journal": "journal",
    "stocks-journal": "journal",
    "portfolio-stocks-journal": "journal",
    "stock-reviews": "reviews",
    "stocks-reviews": "reviews",
    "portfolio-stocks-reviews": "reviews",
    "portfolio": "positions",
    "research": "research-dashboard",
    "accounts": "accounts",
    "insurance": "insurance",
    "liabilities": "liabilities",
    "records": "records"
  };

  function create({ registry }) {
    function normalizeHash(hash = window.location.hash) {
      const route = (hash || "#dashboard").replace(/^#/, "");
      return ROUTE_ALIASES[route] || route || "dashboard";
    }

    function syncHash() {
      const normalized = normalizeHash();
      const current = (window.location.hash || "#dashboard").replace(/^#/, "");
      if (normalized !== current) {
        window.location.replace(`#${normalized}`);
      }
      return normalized;
    }

    function getCurrentPortfolioModule() {
      return registry.findByRoute(normalizeHash());
    }

    return { normalizeHash, syncHash, getCurrentPortfolioModule };
  }

  return { create };
})();
