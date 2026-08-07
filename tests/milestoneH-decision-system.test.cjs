const assert = require("assert");

global.window = global;
require("../js/decision-domain.js");
require("../js/research-domain.js");
require("../js/data.js");

const decision = global.DecisionDomain;

const state = {
  watchlistStocks: [
    {
      id: "stock-nvda",
      ticker: "NVDA",
      companyName: "Nvidia",
      thesisSummary: "AI demand",
      thesis: "AI demand",
      mainRisks: "Valuation",
      invalidationConditions: "AI capex slows",
      thesisHistory: [
        { id: "thesis-stock-nvda-1", versionNumber: 1, content: "AI demand", savedAt: "2026-07-01" }
      ]
    }
  ],
  positions: [{ stockId: "stock-nvda", isArchived: false }],
  transactions: [
    { id: "tx-1", stockId: "stock-nvda", ticker: "NVDA", type: "buy", date: "2026-07-10", shares: 5, price: 200 }
  ],
  journalEntries: [
    {
      id: "decision-1",
      stockId: "stock-nvda",
      ticker: "NVDA",
      entryType: "buy",
      date: "2026-07-01",
      title: "Plan buy",
      investmentThesis: "AI demand",
      expectedOutcome: "Revenue grows",
      risks: "Valuation",
      confidence: 8,
      price: 190,
      quantity: 5,
      executionStatus: "planned",
      tags: ["AI", "Long Term"],
      thesisVersionId: "thesis-stock-nvda-1",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z"
    },
    {
      id: "decision-2",
      stockId: "stock-nvda",
      ticker: "NVDA",
      decisionType: "thesisUpdate",
      decisionDate: "2026-07-20",
      title: "Update thesis",
      reason: "New demand signal",
      expectedOutcome: "Higher confidence",
      risks: "Valuation",
      confidence: 7,
      executionStatus: "notExecuted",
      tags: ["AI"],
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z"
    }
  ]
};

assert.strictEqual(decision.normalizeDecisionType("watchlistAdd"), "watch");
assert.strictEqual(decision.normalizeDecisionType("addPosition"), "add");
assert.strictEqual(decision.normalizeExecutionStatus("", "tx-1"), "executed");
["watch", "buy", "add", "hold", "reduce", "sell", "avoid", "thesisUpdate"].forEach((type) => {
  const template = decision.getDecisionTemplate(type);
  assert.strictEqual(template.type, type);
  assert(Array.isArray(template.fields));
  assert(template.fields.includes("entryType"));
});

const normalized = decision.normalizeDecision(state.journalEntries[0], state);
assert.strictEqual(normalized.companyId, "stock-nvda");
assert.strictEqual(normalized.decisionType, "buy");
assert.strictEqual(normalized.executionStatus, "planned");
assert.strictEqual(normalized.quantity, 5);

const invalid = decision.validateDecision({ date: "", entryType: "buy", investmentThesis: "", expectedOutcome: "", risks: "", confidence: 11 });
assert.strictEqual(invalid.valid, false);
assert(invalid.errors.some((error) => error.includes("日期")));

const valid = decision.validateDecision({
  date: "2026-07-28",
  entryType: "hold",
  executionStatus: "planned",
  investmentThesis: "Still valid",
  expectedOutcome: "Hold",
  risks: "Valuation",
  confidence: 6
});
assert.strictEqual(valid.valid, true);

const validWatchWithoutRiskOrConfidence = decision.validateDecision({
  date: "2026-07-28",
  entryType: "watch",
  executionStatus: "planned",
  investmentThesis: "Worth tracking",
  expectedOutcome: "Monitor revenue and valuation",
  risks: "",
  confidence: ""
});
assert.strictEqual(validWatchWithoutRiskOrConfidence.valid, true);

const invalidAvoidWithoutReason = decision.validateDecision({
  date: "2026-07-28",
  entryType: "avoid",
  executionStatus: "notExecuted",
  investmentThesis: "",
  risks: "Unclear unit economics"
});
assert.strictEqual(invalidAvoidWithoutReason.valid, false);

const beforePosition = JSON.stringify(state.positions);
const plannedDecision = { ...state.journalEntries[0], transactionId: "tx-1", executionStatus: "executed" };
const comparison = decision.comparePlannedExecuted(decision.normalizeDecision(plannedDecision, state), state.transactions[0]);
assert.strictEqual(comparison.hasTransaction, true);
assert.strictEqual(comparison.priceDiff, 10);
assert.strictEqual(JSON.stringify(state.positions), beforePosition, "Decision compare must not mutate Position");

const filtered = decision.filterAndSortDecisions(state.journalEntries, state, { tag: "long", type: "buy" });
assert.strictEqual(filtered.length, 1);
assert.strictEqual(filtered[0].id, "decision-1");

const newest = decision.filterAndSortDecisions(state.journalEntries, state, { sortBy: "newest" });
assert.strictEqual(newest[0].id, "decision-2");

const archived = decision.filterAndSortDecisions([{ ...state.journalEntries[0], isArchived: true }], state, {});
assert.strictEqual(archived.length, 0);
assert.strictEqual(decision.filterAndSortDecisions([{ ...state.journalEntries[0], isArchived: true }], state, { includeArchived: true }).length, 1);

const stockForThesis = {
  id: "stock-test",
  thesisSummary: "Old thesis",
  catalysts: "Old catalyst",
  mainRisks: "Old risk",
  invalidationConditions: "Old invalidation",
  thesisStatus: "active",
  thesisHistory: []
};
global.ResearchDomain.applyThesisReview(stockForThesis, {
  thesisSummary: "New thesis",
  catalysts: "New catalyst",
  mainRisks: "New risk",
  invalidationConditions: "New invalidation",
  thesisStatus: "needsReview",
  changeReason: "New facts",
  createdByDecisionId: "decision-2"
}, "2026-07-28T00:00:00.000Z");
assert.strictEqual(stockForThesis.thesisHistory[0].versionNumber, 1);
assert.strictEqual(stockForThesis.thesisHistory[0].content, "New thesis");
assert.strictEqual(stockForThesis.thesisHistory[0].createdByDecisionId, "decision-2");

const summary = decision.buildSummary(state, () => ({ shares: 5 }));
assert.strictEqual(summary.recent.length, 2);
assert.strictEqual(summary.planned.length, 1);
assert.strictEqual(summary.thesisUpdates.length, 1);

const serialized = JSON.stringify({ normalized, comparison, summary });
assert(!serialized.includes("NaN"));
assert(!serialized.includes("undefined"));

console.log("Milestone H decision system automated tests passed.");
