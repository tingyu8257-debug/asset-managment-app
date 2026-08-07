const assert = require("assert");

require("../js/finance-domain.js");
const F = globalThis.FinanceDomain;
const rates = { TWD: 1, USD: 32 };

assert.strictEqual(F.convertToBaseCurrency(1000, "TWD", rates), 1000);
assert.strictEqual(F.convertToBaseCurrency(100, "USD", rates), 3200);
assert.strictEqual(F.convertToBaseCurrency(100, "EUR", rates), null);
assert.strictEqual(F.formatMoney(null, "USD"), "尚未設定");

const transactions = [
  { id: "1", date: "2026-01-01", type: "buy", shares: 10, price: 100, currency: "USD", fxRateAtTrade: 32 },
  { id: "2", date: "2026-02-01", type: "add", shares: 10, price: 120, currency: "USD", fxRateAtTrade: 32 },
  { id: "3", date: "2026-03-01", type: "reduce", shares: 5, price: 130, currency: "USD", fxRateAtTrade: 32 }
];
let result = F.calculatePositionFinancials(transactions, 140, "USD", rates);
assert.strictEqual(result.shares, 15);
assert.strictEqual(result.averageCostLocal, 110);
assert.strictEqual(result.realizedProfitLossLocal, 100);
assert.strictEqual(result.realizedProfitLossBase, 3200);
assert.strictEqual(result.marketValueBase, 67200);
assert.strictEqual(result.totalCostBase, 52800);
assert.strictEqual(result.unrealizedProfitLossBase, 14400);
assert.strictEqual(result.investedCostBase, 70400);

const exited = F.calculatePositionFinancials([...transactions, { id: "4", date: "2026-04-01", type: "exit", shares: 15, price: 140, currency: "USD", fxRateAtTrade: 32 }], 140, "USD", rates);
assert.strictEqual(exited.shares, 0);
assert.strictEqual(exited.realizedProfitLossLocal, 550);
assert.strictEqual(exited.realizedProfitLossBase, 17600);

const changedFx = F.calculatePositionFinancials(transactions.map((item) => item.id === "3" ? { ...item, fxRateAtTrade: 30 } : item), 140, "USD", rates);
assert.strictEqual(changedFx.realizedProfitLossBase, 3000);
const deleted = F.calculatePositionFinancials(transactions.map((item) => item.id === "3" ? { ...item, isDeleted: true } : item), 140, "USD", rates);
assert.strictEqual(deleted.shares, 20);
assert.strictEqual(deleted.realizedProfitLossLocal, 0);

const totalProfit = result.realizedProfitLossBase + result.unrealizedProfitLossBase;
assert.strictEqual(totalProfit, 17600);
assert.strictEqual(Math.round(totalProfit / result.investedCostBase * 10000) / 100, 25);

global.window = global;
const memory = {};
global.localStorage = { getItem: (key) => memory[key] ?? null, setItem: (key, value) => { memory[key] = value; } };
require("../js/data.js");
memory.settings = JSON.stringify({ baseCurrency: "USD", exchangeRates: { USD: 99, TWD: 0.031, JPY: 0.007 } });
memory.watchlistStocks = JSON.stringify([{ id: "old", ticker: "OLD", thesis: "keep thesis", thesisHistory: [{ thesisSummary: "history" }] }]);
memory.positions = JSON.stringify([{ stockId: "old", currentPrice: 10 }]);
memory.transactions = JSON.stringify([{ id: "old-tx", stockId: "old", ticker: "OLD", date: "2026-01-01", type: "buy", shares: 1, price: 10 }]);
memory.journalEntries = JSON.stringify([{ id: "journal", stockId: "old", ticker: "OLD", title: "keep journal" }]);
require("../js/storage.js");
let loaded = global.AppStorage.load();
assert.strictEqual(loaded.settings.baseCurrency, "TWD");
assert.deepStrictEqual(loaded.settings.supportedCurrencies, ["TWD", "USD"]);
assert.strictEqual(loaded.watchlistStocks[0].currency, "TWD");
assert.strictEqual(loaded.positions[0].currency, "TWD");
assert.strictEqual(loaded.positions[0].currentFx, 1);
assert.strictEqual(loaded.transactions[0].currency, "TWD");
assert.strictEqual(loaded.transactions[0].exchangeRate, null);
assert.strictEqual(loaded.transactions[0].fxRateAtTrade, null);
assert.strictEqual(loaded.journalEntries[0].title, "keep journal");
assert.strictEqual(loaded.watchlistStocks[0].thesisHistory[0].thesisSummary, "history");

memory["coreSatellite.watchlistStocks"] = "{broken";
loaded = global.AppStorage.load();
assert(Array.isArray(loaded.watchlistStocks));
const serialized = JSON.stringify({ result, exited, loaded });
assert(!serialized.includes("NaN") && !serialized.includes("undefined") && !serialized.includes("Infinity"));
console.log("Milestone 4 automated tests passed.");
