const assert = require("assert");

global.window = global;
require("../js/app-constants.js");
require("../js/asset-calculation-core.js");
require("../js/net-worth-selectors.js");

const state = {
  settings: {
    baseCurrency: "TWD",
    exchangeRates: { TWD: 1, USD: 30 }
  },
  watchlistStocks: [
    { id: "stock-live", ticker: "AAA" },
    { id: "stock-zero", ticker: "ZERO" },
    { id: "stock-archived", ticker: "OLD" },
    { id: "stock-watch-only", ticker: "WATCH" }
  ],
  positions: [
    { stockId: "stock-live", currentPrice: 20, currency: "TWD", updatedAt: "2026-07-20T00:00:00.000Z" },
    { stockId: "stock-zero", currentPrice: 50, currency: "TWD", updatedAt: "2026-07-21T00:00:00.000Z" },
    { stockId: "stock-archived", currentPrice: 99, currency: "TWD", isArchived: true, updatedAt: "2026-07-22T00:00:00.000Z" }
  ],
  transactions: [
    { id: "t1", stockId: "stock-live", date: "2026-07-01", createdAt: "2026-07-01T00:00:00.000Z" }
  ],
  financialAccounts: [
    { id: "bank", name: "Bank", type: "bank", currency: "TWD", updatedAt: "2026-07-01T00:00:00.000Z" },
    { id: "broker-usd", name: "Broker USD", type: "brokerageCash", currency: "USD", currentFx: 30, updatedAt: "2026-07-02T00:00:00.000Z" },
    { id: "broker-custom-fx", name: "Broker Custom FX", type: "brokerageCash", currency: "USD", currentFx: 31, updatedAt: "2026-07-03T00:00:00.000Z" },
    { id: "archived-account", name: "Archived", type: "cash", currency: "TWD", isArchived: true, updatedAt: "2026-07-04T00:00:00.000Z" }
  ],
  accountBalances: [
    { id: "b-old", accountId: "bank", amount: 10000, balanceDate: "2026-07-01", updatedAt: "2026-07-01T00:00:00.000Z" },
    { id: "b-new", accountId: "bank", amount: 15000, balanceDate: "2026-07-05", updatedAt: "2026-07-05T00:00:00.000Z" },
    { id: "b-usd", accountId: "broker-usd", amount: 100, balanceDate: "2026-07-04", updatedAt: "2026-07-04T00:00:00.000Z" },
    { id: "b-custom-fx", accountId: "broker-custom-fx", amount: 100, balanceDate: "2026-07-06", updatedAt: "2026-07-06T00:00:00.000Z" },
    { id: "b-archived", accountId: "archived-account", amount: 99999, balanceDate: "2026-07-07", updatedAt: "2026-07-07T00:00:00.000Z" }
  ],
  insurancePolicies: [
    { id: "policy-included", includeInNetWorth: true, currentCashValue: 50000, coverageAmount: 1000000, premiumAmount: 12000, cashValueCurrency: "TWD", updatedAt: "2026-07-08T00:00:00.000Z" },
    { id: "policy-usd", includeInNetWorth: true, currentCashValue: 1000, coverageAmount: 1000000, premiumAmount: 12000, cashValueCurrency: "USD", currentFx: 31, updatedAt: "2026-07-09T00:00:00.000Z" },
    { id: "policy-excluded", includeInNetWorth: false, currentCashValue: 80000, coverageAmount: 2000000, cashValueCurrency: "TWD", updatedAt: "2026-07-09T00:00:00.000Z" }
  ],
  liabilities: [
    { id: "loan", currentBalance: 40000, originalAmount: 100000, currency: "TWD", status: "active", updatedAt: "2026-07-10T00:00:00.000Z" },
    { id: "loan-usd", currentBalance: 100, originalAmount: 999999, currency: "USD", currentFx: 32, status: "active", updatedAt: "2026-07-11T00:00:00.000Z" },
    { id: "paid", currentBalance: 30000, originalAmount: 30000, currency: "TWD", status: "paidOff", updatedAt: "2026-07-11T00:00:00.000Z" },
    { id: "zero", currentBalance: 0, originalAmount: 50000, currency: "TWD", status: "active", updatedAt: "2026-07-12T00:00:00.000Z" }
  ]
};

function getAllCalculatedPositions() {
  return [
    { stockId: "stock-live", shares: 10, marketValueBase: 20000 },
    { stockId: "stock-zero", shares: 0, marketValueBase: 9999 },
    { stockId: "stock-archived", shares: 10, marketValueBase: 9999 }
  ];
}

const selectors = global.NetWorthSelectors.create({ state, getAllCalculatedPositions });
const summary = selectors.getNetWorthSummary();

assert.strictEqual(selectors.getLatestBalanceForAccount("bank").amount, 15000);
assert.strictEqual(summary.cashBase, 21100);
assert.strictEqual(summary.investmentsBase, 20000);
assert.strictEqual(summary.insuranceCashValueBase, 81000);
assert.strictEqual(summary.totalAssetsBase, 122100);
assert.strictEqual(summary.totalLiabilitiesBase, 43200);
assert.strictEqual(summary.netWorthBase, 78900);
assert.strictEqual(summary.allocation.cashPercent, 17.2809);
assert.strictEqual(summary.allocation.investmentPercent, 16.3800);
assert.strictEqual(summary.allocation.insurancePercent, 66.3391);
assert.strictEqual(summary.investmentBreakdown.length, 1);
assert.strictEqual(summary.latestUpdatedAt, "2026-07-20T00:00:00.000Z");
assert(!JSON.stringify(summary).includes("NaN"));
assert(!JSON.stringify(summary).includes("undefined"));

const emptySelectors = global.NetWorthSelectors.create({
  state: {
    settings: { baseCurrency: "TWD", exchangeRates: { TWD: 1 } },
    financialAccounts: [],
    accountBalances: [],
    insurancePolicies: [],
    liabilities: [],
    positions: [],
    transactions: []
  },
  getAllCalculatedPositions: () => []
});
const emptySummary = emptySelectors.getNetWorthSummary();
assert.strictEqual(emptySummary.totalAssetsBase, 0);
assert.strictEqual(emptySummary.allocation.cashPercent, 0);
assert.strictEqual(emptySummary.allocation.investmentPercent, 0);
assert.strictEqual(emptySummary.allocation.insurancePercent, 0);
assert.strictEqual(emptySummary.latestUpdatedAt, "");

console.log("Milestone C Net Worth automated tests passed.");
