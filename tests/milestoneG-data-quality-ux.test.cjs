const assert = require("assert");

require("../js/portfolio/stocks/stock-research-system.js");

const research = global.StockResearchSystem;

const state = {
  settings: { researchOutdatedDays: 90 },
  watchlistStocks: [
    {
      id: "stock-nvda",
      ticker: " nvda ",
      companyName: "Nvidia",
      businessOverview: "GPU and AI platform",
      thesisSummary: "AI demand",
      growthDrivers: "Data center",
      competitiveAdvantages: "CUDA",
      valuationNotes: "Premium valuation",
      researchNotes: "Watch margins",
      tags: ["AI", "ai", "Semiconductor"],
      nextReviewDate: "2026-07-01",
      lastUpdatedDate: "2026-07-20",
      thesisStatus: "active",
      thesisHistory: []
    },
    {
      id: "stock-nvda-duplicate",
      ticker: "NVDA",
      companyName: "Duplicate Nvidia",
      thesisSummary: "",
      tags: [],
      lastUpdatedDate: "",
      thesisStatus: "needsReview",
      thesisHistory: []
    },
    {
      id: "stock-aapl",
      ticker: "AAPL",
      companyName: "Apple",
      businessOverview: "",
      thesisSummary: "",
      tags: ["Consumer"],
      lastUpdatedDate: "",
      thesisStatus: "active",
      thesisHistory: []
    }
  ],
  positions: [
    { stockId: "stock-nvda" },
    { stockId: "missing-stock" }
  ],
  transactions: [
    { id: "tx-nvda", stockId: "stock-nvda" },
    { id: "tx-orphan", stockId: "missing-stock" }
  ],
  journalEntries: [
    { id: "journal-nvda", stockId: "stock-nvda", transactionId: "tx-nvda", ticker: "NVDA", confidence: 8, title: "Buy NVDA", date: "2026-07-22", investmentThesis: "AI" },
    { id: "journal-orphan", stockId: "missing-stock", transactionId: "missing-tx", ticker: "BAD", confidence: 3, title: "Broken link", date: "2026-07-22" }
  ]
};

const calculatePosition = (stockId) => stockId === "stock-nvda"
  ? { shares: 5 }
  : { shares: 0 };

assert.strictEqual(research.normalizeSymbol(" nvda "), "NVDA");
assert.deepStrictEqual(research.normalizeTags(["AI", "ai", "Semiconductor"]), ["AI", "Semiconductor"]);
assert.strictEqual(research.normalizeDate("2026-07-28"), "2026-07-28");
assert.strictEqual(research.normalizeDate("not-a-date"), "");

const duplicates = research.findDuplicateSymbols(state.watchlistStocks);
assert.strictEqual(duplicates.length, 1);
assert.strictEqual(duplicates[0].symbol, "NVDA");

const orphans = research.findOrphanReferences(state);
assert.strictEqual(orphans.some((issue) => issue.type === "position"), true);
assert.strictEqual(orphans.some((issue) => issue.message.includes("missing transaction")), true);

const dashboard = research.buildResearchDashboard({ state, calculatePosition, currentDate: "2026-07-28" });
assert.strictEqual(dashboard.statuses.length, 3);
assert.strictEqual(dashboard.statuses.find((item) => item.stock.id === "stock-aapl").status, research.RESEARCH_STATUS.missing);

const aiResults = research.applyResearchDashboardQuery(dashboard.statuses, { keyword: "ai", status: "hasResearch", sortBy: "confidence", sortDirection: "desc" });
assert.strictEqual(aiResults.length, 1);
assert.strictEqual(aiResults[0].stock.id, "stock-nvda");

const positioned = research.applyResearchDashboardQuery(dashboard.statuses, { position: "hasPosition" });
assert.deepStrictEqual(positioned.map((item) => item.stock.id), ["stock-nvda"]);

const validation = research.validateResearchInput({ ticker: " nvda ", companyName: "Another", nextReviewDate: "bad" }, state.watchlistStocks, "");
assert.strictEqual(validation.valid, false);
assert(validation.errors.some((error) => error.includes("already exists")));
assert(validation.errors.some((error) => error.includes("Next Review Date")));

console.log("Milestone G data quality and UX logic tests passed.");
