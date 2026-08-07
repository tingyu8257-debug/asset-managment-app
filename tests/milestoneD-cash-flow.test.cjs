const assert = require("assert");

global.window = global;
require("../js/asset-calculation-core.js");
require("../js/cash-flow-domain.js");
require("../js/cash-flow-service.js");

const parts = global.CashFlowDomain.normalizeStateParts({});
const state = {
  financialAccounts: [
    { id: "bank", name: "Bank", type: "bank", currency: "TWD", isArchived: false },
    { id: "broker", name: "Brokerage Cash", type: "brokerageCash", currency: "TWD", isArchived: false }
  ],
  accountBalances: [
    { id: "balance-bank", accountId: "bank", amount: 1000, balanceDate: "2026-07-01", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" }
  ],
  liabilities: [
    { id: "card", name: "Credit Card", type: "creditCard", currentBalance: 0, currency: "TWD", status: "paidOff", isArchived: false }
  ],
  ...parts
};

const savedKeys = [];
let clock = 0;
const repo = global.CashFlowDomain.createRepository(state, (key) => savedKeys.push(key), {
  now: () => `2026-07-10T00:00:${String(clock++).padStart(2, "0")}.000Z`
});

const food = state.expenseCategories.find((item) => item.name === "Food");
const salary = state.incomeCategories.find((item) => item.name === "Salary");

repo.createEntry({ type: "expense", date: "2026-07-10", amount: 100, currency: "TWD", exchangeRate: 1, categoryId: food.id, paymentMethod: "bank", accountId: "bank", title: "Lunch" });
assert.strictEqual(repo.getLatestBalance("bank").amount, 900);

repo.createEntry({ type: "income", date: "2026-07-10", amount: 500, currency: "TWD", exchangeRate: 1, categoryId: salary.id, accountId: "bank", title: "Salary" });
assert.strictEqual(repo.getLatestBalance("bank").amount, 1400);

repo.createEntry({ type: "expense", date: "2026-07-10", amount: 200, currency: "TWD", exchangeRate: 1, categoryId: food.id, paymentMethod: "creditCard", liabilityId: "card", title: "Groceries" });
assert.strictEqual(state.liabilities[0].currentBalance, 200);

repo.createEntry({ type: "transfer", date: "2026-07-10", amount: 300, currency: "TWD", exchangeRate: 1, transferType: "assetToAsset", accountId: "bank", toAccountId: "broker", title: "Move to broker" });
assert.strictEqual(repo.getLatestBalance("bank").amount, 1100);
assert.strictEqual(repo.getLatestBalance("broker").amount, 300);

repo.createEntry({ type: "transfer", date: "2026-07-10", amount: 200, currency: "TWD", exchangeRate: 1, transferType: "assetToCreditCard", accountId: "bank", liabilityId: "card", title: "Pay card" });
assert.strictEqual(repo.getLatestBalance("bank").amount, 900);
assert.strictEqual(state.liabilities[0].currentBalance, 0);
assert.strictEqual(state.liabilities[0].status, "paidOff");

repo.upsertBudget({ month: "2026-07", categoryId: food.id, amount: 400, currency: "TWD", exchangeRate: 1 });
const service = global.CashFlowService.create({ state });
const summary = service.calculateMonth("2026-07");
assert.strictEqual(summary.income, 500);
assert.strictEqual(summary.expense, 300);
assert.strictEqual(summary.netCashFlow, 200);
assert.strictEqual(summary.savingsRate, 40);
const budget = service.budgetOverview("2026-07")[0];
assert.strictEqual(budget.spent, 300);
assert.strictEqual(budget.remaining, 100);
assert.strictEqual(budget.usagePercent, 75);
assert(savedKeys.includes("cashFlowEntries"));
assert(savedKeys.includes("accountBalances"));
assert(savedKeys.includes("liabilities"));
assert(!JSON.stringify({ state, summary, budget }).includes("NaN"));
assert(!JSON.stringify({ state, summary, budget }).includes("undefined"));

console.log("Milestone D Cash Flow automated tests passed.");
