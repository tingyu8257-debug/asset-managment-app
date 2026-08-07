const assert = require("assert");

global.window = global;
require("../js/app-constants.js");
require("../js/asset-calculation-core.js");
require("../js/app-formatters.js");
require("../js/calculation-service.js");

const state = {
  financialAccounts: [
    { id: "cash", name: "Cash", currency: "TWD", currentFx: 1, updatedAt: "2026-07-01T00:00:00.000Z" },
    { id: "ibkr", name: "IBKR", currency: "USD", currentFx: 32.5, updatedAt: "2026-07-02T00:00:00.000Z" },
    { id: "usd-missing-fx", name: "Missing FX", currency: "USD", currentFx: null, updatedAt: "2026-07-03T00:00:00.000Z" },
    { id: "no-balance", name: "No Balance", currency: "TWD", currentFx: 1, updatedAt: "2026-07-04T00:00:00.000Z" }
  ],
  accountBalances: [
    { id: "cash-old", accountId: "cash", amount: 100, balanceDate: "2026-07-01", updatedAt: "2026-07-01T00:00:00.000Z" },
    { id: "cash-new", accountId: "cash", amount: 1000, balanceDate: "2026-07-05", updatedAt: "2026-07-05T00:00:00.000Z" },
    { id: "ibkr-balance", accountId: "ibkr", amount: 100, balanceDate: "2026-07-02", updatedAt: "2026-07-02T00:00:00.000Z" }
  ],
  insurancePolicies: [
    { id: "policy", name: "Savings Policy", includeInNetWorth: true, currentCashValue: 1000, cashValueCurrency: "USD", currentFx: 31, updatedAt: "2026-07-06T00:00:00.000Z" },
    { id: "empty-policy", name: "Empty Policy", includeInNetWorth: true, currentCashValue: 0, cashValueCurrency: "TWD", currentFx: 1, updatedAt: "2026-07-07T00:00:00.000Z" }
  ],
  liabilities: [
    { id: "loan", name: "Loan", currentBalance: 1000, currency: "TWD", currentFx: 1, status: "active", updatedAt: "2026-07-08T00:00:00.000Z" }
  ],
  positions: [
    { stockId: "stock-live", currency: "USD", currentFx: 32, updatedAt: "2026-07-09T00:00:00.000Z" },
    { stockId: "stock-zero", currency: "TWD", currentFx: 1, updatedAt: "2026-07-10T00:00:00.000Z" }
  ],
  transactions: [
    { id: "tx", stockId: "stock-live", ticker: "NVDA", type: "buy", date: "2026-07-09", reason: "Initial buy", updatedAt: "2026-07-09T00:00:00.000Z" }
  ]
};

const stocks = {
  "stock-live": { id: "stock-live", ticker: "NVDA", companyName: "NVIDIA" },
  "stock-zero": { id: "stock-zero", ticker: "ZERO", companyName: "Zero Inc." }
};

const service = global.CalculationService.create({
  state,
  getStock: (id) => stocks[id],
  getAllCalculatedPositions: () => [
    { stockId: "stock-live", shares: 2, currency: "USD", marketValueBase: 6400 },
    { stockId: "stock-zero", shares: 0, currency: "TWD", marketValueBase: null }
  ]
});

assert.strictEqual(global.AppFormatters.formatCurrency(1234, "TWD"), "NT$1,234");
assert.strictEqual(global.AppFormatters.formatCurrency(12.3, "USD"), "US$12.30");
assert.strictEqual(global.AppFormatters.formatPercentage(12.345), "12.3%");

const dashboard = service.getDashboardSummary();
assert.strictEqual(dashboard.assets.cash.total, 4250);
assert.strictEqual(dashboard.assets.investments.total, 6400);
assert.strictEqual(dashboard.assets.insurance.total, 31000);
assert.strictEqual(dashboard.assets.total, 41650);
assert.strictEqual(dashboard.liabilities.total, 1000);
assert.strictEqual(dashboard.netWorth.total, 40650);
assert.strictEqual(dashboard.allocation.cashPercent, 10.2041);
assert.strictEqual(dashboard.latestActivity.length, 10);
assert(dashboard.latestActivity[0].title.includes("Position Updated"));
assert(dashboard.warnings.some((warning) => warning.message.includes("沒有 Balance")));
assert(dashboard.warnings.some((warning) => warning.message.includes("沒有 Current FX")));
assert(dashboard.warnings.some((warning) => warning.message.includes("Quantity=0")));

const cached = service.getDashboardSummary();
assert.strictEqual(cached, dashboard);
service.invalidate();
assert.notStrictEqual(service.getDashboardSummary(), dashboard);

console.log("Milestone C Dashboard UI automated tests passed.");
