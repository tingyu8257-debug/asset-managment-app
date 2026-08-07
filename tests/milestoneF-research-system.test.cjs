const assert = require("assert");

require("../js/portfolio/stocks/stock-research-system.js");
require("../js/research-domain.js");

const researchSystem = global.StockResearchSystem;

const state = {
  settings: { researchOutdatedDays: 90 },
  watchlistStocks: [
    {
      id: "stock-nvda",
      ticker: "NVDA",
      companyName: "Nvidia",
      thesisSummary: "AI accelerator demand",
      thesis: "AI accelerator demand",
      businessOverview: "GPU platform company",
      growthDrivers: "Data center",
      competitiveAdvantages: "CUDA ecosystem",
      mainRisks: "Export controls",
      invalidationConditions: "Data center growth breaks",
      thesisStatus: "active",
      nextReviewDate: "2026-07-01",
      lastUpdatedDate: "2026-04-01",
      thesisHistory: [
        { savedAt: "2026-04-01", thesisSummary: "Old thesis", thesisStatus: "active", changeReason: "Initial" }
      ],
      tags: ["AI"]
    },
    {
      id: "stock-empty",
      ticker: "EMPTY",
      companyName: "Empty Research",
      thesisSummary: "尚未設定",
      thesis: "",
      businessOverview: "",
      mainRisks: "",
      invalidationConditions: "",
      thesisStatus: "needsReview",
      nextReviewDate: "",
      lastUpdatedDate: "",
      thesisHistory: [],
      tags: []
    }
  ],
  journalEntries: [
    {
      id: "journal-1",
      stockId: "stock-nvda",
      ticker: "NVDA",
      entryType: "buy",
      title: "Buy NVDA",
      date: "2026-06-01",
      confidence: 8,
      investmentThesis: "Buy for AI demand",
      risks: "Valuation",
      updatedAt: "2026-06-01T00:00:00.000Z"
    },
    {
      id: "journal-2",
      stockId: "stock-nvda",
      ticker: "NVDA",
      entryType: "review",
      title: "Quarterly Review",
      date: "2026-07-02",
      confidence: 7,
      investmentThesis: "Still valid",
      lessonsLearned: ["Poor Valuation"],
      updatedAt: "2026-07-02T00:00:00.000Z"
    }
  ],
  transactions: [
    { id: "tx-1", stockId: "stock-nvda", ticker: "NVDA", type: "buy", date: "2026-06-01", shares: 2, price: 100, currency: "USD" }
  ]
};

const calculatePosition = (stockId) => stockId === "stock-nvda"
  ? { shares: 2, marketValueLocal: 250, currency: "USD" }
  : { shares: 0, marketValueLocal: null, currency: "USD" };

const dashboard = researchSystem.buildResearchDashboard({ state, calculatePosition, currentDate: "2026-07-28" });

assert.strictEqual(dashboard.companiesWithoutResearch.length, 1);
assert.strictEqual(dashboard.companiesWithoutResearch[0].stock.ticker, "EMPTY");
assert.strictEqual(dashboard.upcomingReviews.some((item) => item.stock.ticker === "NVDA"), true);
assert.strictEqual(dashboard.outdatedResearch.some((item) => item.stock.ticker === "EMPTY"), true);
assert.strictEqual(dashboard.recentDecisions[0].title, "Quarterly Review");
assert.strictEqual(dashboard.recentThesisUpdates[0].stock.ticker, "NVDA");

const workspace = researchSystem.buildCompanyWorkspace({ state, stockId: "stock-nvda", calculatePosition });
assert.strictEqual(workspace.stock.ticker, "NVDA");
assert.strictEqual(workspace.transactions.length, 1);
assert.strictEqual(workspace.reviews.length, 1);
assert.strictEqual(workspace.latestDecision.title, "Quarterly Review");
assert.strictEqual(workspace.thesisHistory[0].version, 1);

const stockForThesis = {
  thesisSummary: "Old",
  catalysts: "Old catalysts",
  mainRisks: "Old risks",
  invalidationConditions: "Old invalidation",
  thesisStatus: "active",
  thesisHistory: []
};
global.ResearchDomain.applyThesisReview(stockForThesis, {
  thesisSummary: "New",
  catalysts: "New catalysts",
  mainRisks: "New risks",
  invalidationConditions: "New invalidation",
  thesisStatus: "needsReview",
  changeReason: "New information"
}, "2026-07-28T00:00:00.000Z");
assert.strictEqual(stockForThesis.thesisHistory[0].version, 1);
assert.strictEqual(stockForThesis.thesisHistory[0].previousContent.thesisSummary, "Old");
assert.strictEqual(stockForThesis.thesisHistory[0].currentContent.thesisSummary, "New");
assert.strictEqual(stockForThesis.thesisSummary, "New");

console.log("Milestone F research system automated tests passed.");
