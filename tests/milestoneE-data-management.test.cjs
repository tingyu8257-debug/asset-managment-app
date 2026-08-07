const assert = require("assert");

global.window = global;
const memory = {};
global.localStorage = {
  getItem: (key) => memory[key] || null,
  setItem: (key, value) => { memory[key] = String(value); },
  removeItem: (key) => { delete memory[key]; }
};

require("../js/data-management-service.js");

const state = {
  settings: { baseCurrency: "TWD" },
  watchlistStocks: [{ id: "stock-a", ticker: "AAA", companyName: "Alpha", tags: ["Long Term"], updatedAt: "2026-07-01T00:00:00.000Z" }],
  positions: [{ id: "position-a", stockId: "stock-a", currentPrice: 10, updatedAt: "2026-07-02T00:00:00.000Z" }],
  transactions: [{ id: "tx-a", stockId: "stock-a", type: "buy", date: "2026-07-01", price: 10, shares: 1 }],
  journalEntries: [{ id: "journal-a", ticker: "AAA", title: "Alpha review", investmentThesis: "Why", expectedOutcome: "Grow", risks: "Risk", tags: ["Tax"], updatedAt: "2026-07-03T00:00:00.000Z" }],
  financialAccounts: [{ id: "account-a", name: "Bank", note: "Family", updatedAt: "2026-07-04T00:00:00.000Z" }],
  accountBalances: [{ id: "balance-a", accountId: "account-a", amount: 100, balanceDate: "2026-07-04" }],
  insurancePolicies: [],
  liabilities: [],
  incomeCategories: [{ id: "income-category-salary", type: "income", name: "Salary" }],
  expenseCategories: [{ id: "expense-category-food", type: "expense", name: "Food" }],
  cashFlowEntries: [{ id: "cash-a", type: "expense", date: "2026-07-05", amount: 50, title: "Lunch", note: "Family meal", tags: ["Family"], updatedAt: "2026-07-05T00:00:00.000Z" }],
  recurringCashFlows: [],
  monthlyBudgets: []
};

const saved = [];
const storage = {
  restore(payload) {
    Object.assign(state, payload);
    return state;
  }
};

const service = global.DataManagementService.create({
  state,
  storage,
  savePart: (name) => saved.push(name),
  today: () => "2026-07-27"
});

const exported = service.exportBackup();
const backup = JSON.parse(exported);
assert.strictEqual(backup.schemaVersion, 5);
assert.strictEqual(backup.appVersion, "1.0.0");
assert(backup.exportedAt);
assert.strictEqual(backup.data.watchlistStocks.length, 1);

const duplicateBackup = JSON.stringify({
  schemaVersion: 5,
  appVersion: "1.0.0",
  exportedAt: "2026-07-27T00:00:00.000Z",
  data: {
    watchlistStocks: [
      { id: "stock-a", ticker: "AAA", companyName: "Alpha Imported" },
      { id: "stock-a", ticker: "AAA", companyName: "Duplicate ignored by validation" }
    ],
    cashFlowEntries: [{ id: "cash-b", type: "income", date: "2026-07-10", amount: 100, title: "Bonus", tags: ["Japan 2026"] }]
  }
});
const summary = service.prepareImport(duplicateBackup);
assert.strictEqual(summary.summary.watchlistStocks, 2);
assert.doesNotThrow(() => service.applyImport("merge"));
assert(memory["coreSatellite.recoveryBackup"]);
assert(service.hasRecoveryBackup());
assert(state.watchlistStocks.some((stock) => stock.companyName === "Duplicate ignored by validation"));
assert(state.cashFlowEntries.some((entry) => entry.id === "cash-b"));
service.restorePreviousState();
assert(!state.cashFlowEntries.some((entry) => entry.id === "cash-b"));
assert.strictEqual(state.watchlistStocks[0].companyName, "Alpha");

assert(service.search("Family").length >= 2);
assert(service.search("AAA").some((item) => item.route === "watchlist"));

const badBackup = JSON.stringify({ data: { cashFlowEntries: [{ id: "bad", date: "bad-date", amount: "NaN" }] } });
assert.throws(() => service.prepareImport(badBackup), /日期無效|不可是 NaN/);
assert.deepStrictEqual(service.validateCurrent(), []);

console.log("Milestone E data management automated tests passed.");
