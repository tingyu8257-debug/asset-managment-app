const assert = require("assert");

require("../js/personal-finance-domain.js");
const PF = globalThis.PersonalFinanceDomain;

function createMemoryState() {
  return {
    settings: { supportedCurrencies: ["TWD", "USD", "JPY"], baseCurrency: "TWD" },
    financialAccounts: [],
    accountBalances: [],
    insurancePolicies: [],
    liabilities: []
  };
}

const saved = [];
const state = createMemoryState();
const repo = PF.createRepository(state, (name) => saved.push(name), { now: () => "2026-07-27T00:00:00.000Z" });

const bank = repo.createAccount({ id: "account-bank", name: "Main Bank", type: "bank", currency: "TWD", purpose: "daily" });
const brokerage = repo.createAccount({ id: "account-broker-usd", name: "Broker USD", type: "brokerageCash", currency: "USD", currentFx: 32, purpose: "satelliteInvestment" });
const anotherBrokerage = repo.createAccount({ id: "account-broker-twd", name: "Broker TWD", type: "brokerageCash", currency: "TWD", purpose: "settlement" });
assert.strictEqual(state.financialAccounts.length, 3);
assert.strictEqual(state.financialAccounts.filter((account) => account.type === "brokerageCash").length, 2);
assert.throws(() => repo.updateAccount(bank.id, { linkedAccountId: bank.id }), /自己/);
assert.throws(() => repo.createAccount({ name: "Bad Currency", type: "bank", currency: "JPY", purpose: "daily" }), /不支援/);
assert.throws(() => repo.createAccount({ name: "Missing FX", type: "bank", currency: "USD", purpose: "daily" }), /匯率/);

repo.createBalance({ id: "balance-old", accountId: bank.id, amount: 1000, balanceDate: "2026-01-01" });
repo.createBalance({ id: "balance-new", accountId: bank.id, amount: 2000, balanceDate: "2026-02-01" });
repo.createBalance({ id: "balance-newer-updated", accountId: bank.id, amount: 2200, balanceDate: "2026-02-01", updatedAt: "2026-07-28T00:00:00.000Z" });
repo.createBalance({ id: "balance-usd", accountId: brokerage.id, amount: 300, balanceDate: "2026-02-01" });
repo.createBalance({ id: "balance-broker-twd", accountId: anotherBrokerage.id, amount: 500, balanceDate: "2026-03-01" });
assert.strictEqual(repo.getLatestBalanceByAccountId(bank.id).amount, 2200);
assert.deepStrictEqual(repo.getLatestBalancesGroupedByCurrency(), { TWD: 2700, USD: 300 });

repo.archiveAccount(anotherBrokerage.id);
assert.deepStrictEqual(repo.getLatestBalancesGroupedByCurrency(), { TWD: 2200, USD: 300 });
repo.restoreAccount(anotherBrokerage.id);
assert.deepStrictEqual(repo.getLatestBalancesGroupedByCurrency(), { TWD: 2700, USD: 300 });

repo.deleteAccount(brokerage.id);
assert.strictEqual(state.accountBalances.some((balance) => balance.accountId === brokerage.id), false);
assert.throws(() => repo.createBalance({ accountId: "missing", amount: 1, balanceDate: "2026-01-01" }), /不存在/);
assert.throws(() => repo.createBalance({ accountId: bank.id, amount: -1, balanceDate: "2026-01-01" }), /不小於 0/);

const policy = repo.createPolicy({
  id: "policy-life",
  name: "Life Policy",
  category: "life",
  paymentFrequency: "annual",
  premiumAmount: 12000,
  coverageAmount: 1000000,
  currentCashValue: 50000,
  cashValueCurrency: "TWD",
  cashValueDate: "2026-07-01",
  includeInNetWorth: true,
  status: "active"
});
repo.updatePolicy(policy.id, { currentCashValue: 52000 });
assert.strictEqual(state.insurancePolicies[0].currentCashValue, 52000);
assert.throws(() => repo.createPolicy({ name: "Bad", category: "life", paymentFrequency: "annual", cashValueCurrency: "EUR" }), /不支援/);

const liability = repo.createLiability({
  id: "liability-loan",
  name: "Loan",
  type: "personalLoan",
  lender: "Bank",
  currency: "TWD",
  currentBalance: 100000,
  originalAmount: 120000,
  interestRate: 2.5,
  nextPaymentDate: "2026-08-01",
  status: "active"
});
repo.markLiabilityPaidOff(liability.id);
assert.strictEqual(state.liabilities[0].currentBalance, 0);
assert.strictEqual(state.liabilities[0].status, "paidOff");
assert.throws(() => repo.createLiability({ name: "Bad", type: "personalLoan", currency: "TWD", currentBalance: -1 }), /不可為負數/);

const normalized = PF.normalizeStateParts({
  financialAccounts: [{ id: "a", name: "A", type: "bank", currency: "TWD" }],
  accountBalances: [{ id: "b", accountId: "a", amount: 1, balanceDate: "2026-01-01" }, { id: "orphan", accountId: "missing", amount: 1, balanceDate: "2026-01-01" }],
  insurancePolicies: [{}],
  liabilities: [{}]
});
assert.strictEqual(normalized.accountBalances.length, 1);
assert.strictEqual(normalized.financialAccounts[0].purpose, "other");

global.window = global;
const memory = {};
global.localStorage = {
  getItem: (key) => memory[key] ?? null,
  setItem: (key, value) => { memory[key] = value; }
};
require("../js/data.js");
require("../js/storage.js");
let loaded = global.AppStorage.load();
assert(Array.isArray(loaded.financialAccounts));
assert(Array.isArray(loaded.accountBalances));
assert(Array.isArray(loaded.insurancePolicies));
assert(Array.isArray(loaded.liabilities));
assert.strictEqual(loaded.personalFinanceSchemaVersion, 2);

memory["personalFinance.financialAccounts"] = JSON.stringify([{ id: "legacy-account", name: "Legacy", type: "bank", currency: "TWD" }]);
memory["personalFinance.accountBalances"] = JSON.stringify([{ id: "legacy-balance", accountId: "legacy-account", amount: 88, balanceDate: "2026-01-01" }]);
loaded = global.AppStorage.load();
assert.strictEqual(loaded.financialAccounts[0].name, "Legacy");
assert.strictEqual(loaded.accountBalances[0].amount, 88);

memory["personalFinance.financialAccounts"] = "{broken";
loaded = global.AppStorage.load();
assert(Array.isArray(loaded.financialAccounts));

assert.throws(() => global.AppStorage.restore({
  financialAccounts: [{ id: "dup", name: "A", type: "bank", currency: "TWD" }],
  accountBalances: [{ id: "dup", accountId: "dup", amount: 1, balanceDate: "2026-01-01" }]
}), /重複 id/);

const serialized = JSON.stringify({ state, loaded, normalized });
assert(!serialized.includes("NaN"));
assert(!serialized.includes("undefined"));
assert(!serialized.includes("Infinity"));
assert(saved.includes("financialAccounts"));
assert(saved.includes("accountBalances"));
assert(saved.includes("insurancePolicies"));
assert(saved.includes("liabilities"));

console.log("Milestone B automated tests passed.");
