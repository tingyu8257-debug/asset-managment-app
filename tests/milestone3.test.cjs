const assert = require("assert");

require("../js/position-math.js");
require("../js/research-domain.js");

const { calculatePositionFromTransactions, validateTransactionSequence } = globalThis.PositionMath;
const { getReviewReasons, applyThesisReview } = globalThis.ResearchDomain;

const base = [
  { id: "1", date: "2026-01-01", type: "buy", shares: 10, price: 100 },
  { id: "2", date: "2026-02-01", type: "add", shares: 10, price: 200 },
  { id: "3", date: "2026-03-01", type: "reduce", shares: 5, price: 250 }
];

assert.deepStrictEqual(calculatePositionFromTransactions(base), { shares: 15, totalCost: 2250, averageCost: 150, lastTransactionDate: "2026-03-01" });
assert.strictEqual(calculatePositionFromTransactions([...base, { id: "4", date: "2026-04-01", type: "exit", shares: 15, price: 260 }]).shares, 0);
assert.strictEqual(calculatePositionFromTransactions(base.map((item) => item.id === "2" ? { ...item, price: 300 } : item)).averageCost, 200);
assert.strictEqual(calculatePositionFromTransactions(base.map((item) => item.id === "2" ? { ...item, isDeleted: true } : item)).shares, 5);
assert.strictEqual(calculatePositionFromTransactions(base.map((item) => item.id === "2" ? { ...item, isDeleted: false } : item)).shares, 15);
assert.strictEqual(validateTransactionSequence(base.map((item) => item.id === "2" ? { ...item, isDeleted: true } : item)).valid, true);
assert.strictEqual(validateTransactionSequence(base.map((item) => item.id === "1" ? { ...item, isDeleted: true } : item)).valid, false);
assert.strictEqual(validateTransactionSequence([{ date: "2026-01-01", type: "buy", shares: 2, price: 10 }, { date: "2026-02-01", type: "reduce", shares: 3, price: 10 }]).valid, false);
assert.strictEqual(validateTransactionSequence([{ date: "2026-01-01", type: "reduce", shares: 1, price: 10 }, { date: "2026-02-01", type: "buy", shares: 2, price: 10 }]).valid, false);

const stock = { thesisSummary: "old", catalysts: "old catalyst", mainRisks: "old risk", invalidationConditions: "old invalidation", thesisStatus: "active", thesisHistory: [] };
applyThesisReview(stock, { thesisSummary: "new", catalysts: "new catalyst", mainRisks: "new risk", invalidationConditions: "new invalidation", thesisStatus: "needsReview", changeReason: "new facts" }, "2026-06-12T00:00:00.000Z");
assert.strictEqual(stock.thesisHistory.length, 1);
assert.strictEqual(stock.thesisHistory[0].thesisSummary, "old");
assert.strictEqual(stock.thesisSummary, "new");

const reasons = getReviewReasons({ nextReviewDate: "2026-01-01", thesisStatus: "needsReview", lastReviewedAt: "2025-01-01", thesisSummary: "reason", invalidationConditions: "尚未設定" }, null, "2026-06-12");
assert(reasons.some((reason) => reason.includes("nextReviewDate")));
assert(reasons.includes("尚未填寫反證條件"));

global.window = global;
const memory = {};
global.localStorage = { getItem: (key) => memory[key] ?? null, setItem: (key, value) => { memory[key] = value; } };
require("../js/data.js");
memory.watchlistStocks = JSON.stringify([{ ticker: "OLD", companyName: "Old Co", thesis: "legacy thesis" }]);
memory.positions = JSON.stringify([{ ticker: "OLD", shares: 3, averageCost: 25, currentPrice: 30 }]);
memory.journalEntries = JSON.stringify([{ ticker: "OLD", title: "Old journal" }]);
require("../js/storage.js");
let loaded = global.AppStorage.load();
assert.strictEqual(loaded.watchlistStocks[0].thesisSummary, "legacy thesis");
assert.strictEqual(loaded.transactions[0].shares, 3);
assert.strictEqual(loaded.journalEntries[0].entryType, "review");
global.AppStorage.savePart("journalEntries", loaded.journalEntries);
assert(memory["coreSatellite.journalEntries"].includes("Old journal"));
loaded.journalEntries[0].title = "Edited journal";
global.AppStorage.savePart("journalEntries", loaded.journalEntries);
assert.strictEqual(global.AppStorage.load().journalEntries[0].title, "Edited journal");

memory["coreSatellite.watchlistStocks"] = "{broken";
loaded = global.AppStorage.load();
assert(Array.isArray(loaded.watchlistStocks));

const serialized = JSON.stringify({ base, stock, reasons, loaded });
assert(!serialized.includes("NaN"));
assert(!serialized.includes("undefined"));
console.log("Milestone 3 automated tests passed.");
