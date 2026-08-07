const assert = require("assert");

global.window = global;
require("../js/investment-repositories.js");

const saved = [];
const state = {
  watchlistStocks: [
    { id: "stock-a", ticker: "AAA" },
    { id: "stock-b", ticker: "BBB" }
  ],
  positions: [
    { stockId: "stock-a", isArchived: false },
    { stockId: "stock-b", isArchived: true },
    { stockId: "missing-stock", isArchived: false }
  ],
  transactions: [
    { id: "tx-a", stockId: "stock-a", isDeleted: false },
    { id: "tx-b", stockId: "stock-b", isDeleted: true },
    { id: "tx-missing", stockId: "missing-stock", isDeleted: false }
  ],
  journalEntries: [
    { id: "journal-a", stockId: "stock-a", transactionId: "tx-a", isDeleted: false },
    { id: "journal-b", stockId: "stock-b", transactionId: "tx-b", isDeleted: false },
    { id: "journal-deleted", stockId: "stock-a", transactionId: "", isDeleted: true }
  ]
};

const repo = global.InvestmentRepositories.create({
  state,
  savePart: (key) => saved.push(key),
  now: () => "2026-07-27T00:00:00.000Z"
});

repo.cleanupDeletedRecords();
assert.deepStrictEqual(state.positions.map((item) => item.stockId), ["stock-a"]);
assert.deepStrictEqual(state.transactions.map((item) => item.id), ["tx-a"]);
assert.deepStrictEqual(state.journalEntries.map((item) => item.id), ["journal-a"]);
assert(saved.includes("positions"));
assert(saved.includes("transactions"));
assert(saved.includes("journalEntries"));

repo.transactionRepository.deleteTransaction("tx-a");
assert.strictEqual(state.transactions.length, 0);
assert.strictEqual(state.journalEntries[0].transactionId, "");

state.positions.push({ stockId: "stock-a" });
state.transactions.push({ id: "tx-a2", stockId: "stock-a" });
state.journalEntries[0].transactionId = "tx-a2";
repo.positionRepository.deletePosition("stock-a");
assert.strictEqual(state.positions.some((item) => item.stockId === "stock-a"), false);
assert.strictEqual(state.transactions.some((item) => item.stockId === "stock-a"), false);
assert.strictEqual(state.journalEntries[0].transactionId, "");

state.watchlistStocks.push({ id: "stock-c", ticker: "CCC" });
state.positions.push({ stockId: "stock-c" });
state.transactions.push({ id: "tx-c", stockId: "stock-c" });
state.journalEntries.push({ id: "journal-c", stockId: "stock-c", transactionId: "tx-c" });
repo.watchlistRepository.deleteStock("stock-c");
assert.strictEqual(state.watchlistStocks.some((item) => item.id === "stock-c"), false);
assert.strictEqual(state.positions.some((item) => item.stockId === "stock-c"), false);
assert.strictEqual(state.transactions.some((item) => item.stockId === "stock-c"), false);
assert.strictEqual(state.journalEntries.some((item) => item.stockId === "stock-c"), false);

console.log("Investment repository cleanup tests passed.");
