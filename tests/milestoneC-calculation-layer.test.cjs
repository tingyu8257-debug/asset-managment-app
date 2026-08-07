const assert = require("assert");

global.window = global;
require("../js/app-constants.js");
require("../js/asset-calculation-core.js");
require("../js/calculation-service.js");
require("../js/personal-finance-domain.js");

function makeState(overrides = {}) {
  return {
    settings: { baseCurrency: "TWD", supportedCurrencies: ["TWD", "USD"], exchangeRates: { TWD: 1, USD: 1 } },
    financialAccounts: [],
    accountBalances: [],
    insurancePolicies: [],
    liabilities: [],
    positions: [],
    transactions: [],
    watchlistStocks: [
      { id: "stock-a", ticker: "AAA", companyName: "Alpha" },
      { id: "stock-b", ticker: "BBB", companyName: "Beta" },
      { id: "stock-zero", ticker: "ZERO", companyName: "Zero" },
      { id: "stock-archived", ticker: "OLD", companyName: "Archived" },
      { id: "stock-bad", ticker: "BAD", companyName: "Bad Data" }
    ],
    ...overrides
  };
}

function makeService(state, calculatedPositions = []) {
  return global.CalculationService.create({
    state,
    getStock: (id) => state.watchlistStocks.find((stock) => stock.id === id),
    getAllCalculatedPositions: () => calculatedPositions
  });
}

function assertDashboard(input) {
  const state = makeState(input.state);
  const service = makeService(state, input.positions || []);
  const cash = service.calculateCash();
  const investments = service.calculateInvestments();
  const insurance = service.calculateInsurance();
  const liabilities = service.calculateLiabilities();
  const assets = service.calculateAssets();
  const netWorth = service.calculateNetWorth();
  const allocation = service.calculateAllocation();

  assert.strictEqual(cash.total, input.expected.cash, `${input.name}: cash`);
  assert.strictEqual(investments.total, input.expected.investments, `${input.name}: investments`);
  assert.strictEqual(insurance.total, input.expected.insurance, `${input.name}: insurance`);
  assert.strictEqual(liabilities.total, input.expected.liabilities, `${input.name}: liabilities`);
  assert.strictEqual(assets.total, input.expected.assets, `${input.name}: assets`);
  assert.strictEqual(netWorth.total, input.expected.netWorth, `${input.name}: net worth`);
  assert.strictEqual(allocation.cashPercent, input.expected.cashPercent, `${input.name}: cash percent`);
  assert.strictEqual(allocation.investmentPercent, input.expected.investmentPercent, `${input.name}: investment percent`);
  assert.strictEqual(allocation.insurancePercent, input.expected.insurancePercent, `${input.name}: insurance percent`);
}

const calculationCases = [
  {
    name: "Case 1 only cash",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }]
    },
    expected: { cash: 1000, investments: 0, insurance: 0, liabilities: 0, assets: 1000, netWorth: 1000, cashPercent: 100, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 2 cash plus investment",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      positions: [{ stockId: "stock-a", currency: "TWD", currentFx: 1 }]
    },
    positions: [{ stockId: "stock-a", shares: 2, currency: "TWD", marketValueBase: 2000 }],
    expected: { cash: 1000, investments: 2000, insurance: 0, liabilities: 0, assets: 3000, netWorth: 3000, cashPercent: 33.3333, investmentPercent: 66.6667, insurancePercent: 0 }
  },
  {
    name: "Case 3 cash plus insurance",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      insurancePolicies: [{ id: "p1", name: "Policy", includeInNetWorth: true, currentCashValue: 500, cashValueCurrency: "TWD", currentFx: 1 }]
    },
    expected: { cash: 1000, investments: 0, insurance: 500, liabilities: 0, assets: 1500, netWorth: 1500, cashPercent: 66.6667, investmentPercent: 0, insurancePercent: 33.3333 }
  },
  {
    name: "Case 4 cash plus liability",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      liabilities: [{ id: "l1", name: "Loan", currentBalance: 300, currency: "TWD", currentFx: 1, status: "active" }]
    },
    expected: { cash: 1000, investments: 0, insurance: 0, liabilities: 300, assets: 1000, netWorth: 700, cashPercent: 100, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 5 all asset types and liability",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      positions: [{ stockId: "stock-a", currency: "TWD", currentFx: 1 }],
      insurancePolicies: [{ id: "p1", name: "Policy", includeInNetWorth: true, currentCashValue: 500, cashValueCurrency: "TWD", currentFx: 1 }],
      liabilities: [{ id: "l1", name: "Loan", currentBalance: 300, currency: "TWD", currentFx: 1, status: "active" }]
    },
    positions: [{ stockId: "stock-a", shares: 2, currency: "TWD", marketValueBase: 2000 }],
    expected: { cash: 1000, investments: 2000, insurance: 500, liabilities: 300, assets: 3500, netWorth: 3200, cashPercent: 28.5714, investmentPercent: 57.1429, insurancePercent: 14.2857 }
  },
  {
    name: "Case 6 all zero",
    state: {},
    expected: { cash: 0, investments: 0, insurance: 0, liabilities: 0, assets: 0, netWorth: 0, cashPercent: 0, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 7 all USD",
    state: {
      financialAccounts: [{ id: "usd-cash", name: "USD Cash", currency: "USD", currentFx: 30 }],
      accountBalances: [{ id: "b1", accountId: "usd-cash", amount: 100, balanceDate: "2026-07-01" }],
      positions: [{ stockId: "stock-a", currency: "USD", currentFx: 31 }],
      insurancePolicies: [{ id: "p1", name: "USD Policy", includeInNetWorth: true, currentCashValue: 10, cashValueCurrency: "USD", currentFx: 32 }],
      liabilities: [{ id: "l1", name: "USD Loan", currentBalance: 5, currency: "USD", currentFx: 33, status: "active" }]
    },
    positions: [{ stockId: "stock-a", shares: 1, currency: "USD", marketValueBase: 3100 }],
    expected: { cash: 3000, investments: 3100, insurance: 320, liabilities: 165, assets: 6420, netWorth: 6255, cashPercent: 46.729, investmentPercent: 48.2866, insurancePercent: 4.9844 }
  },
  {
    name: "Case 8 TWD and USD mixed",
    state: {
      financialAccounts: [{ id: "twd", name: "TWD", currency: "TWD", currentFx: 1 }, { id: "usd", name: "USD", currency: "USD", currentFx: 30 }],
      accountBalances: [{ id: "b1", accountId: "twd", amount: 1000, balanceDate: "2026-07-01" }, { id: "b2", accountId: "usd", amount: 100, balanceDate: "2026-07-01" }],
      positions: [{ stockId: "stock-a", currency: "USD", currentFx: 31 }]
    },
    positions: [{ stockId: "stock-a", shares: 1, currency: "USD", marketValueBase: 3100 }],
    expected: { cash: 4000, investments: 3100, insurance: 0, liabilities: 0, assets: 7100, netWorth: 7100, cashPercent: 56.338, investmentPercent: 43.662, insurancePercent: 0 }
  },
  {
    name: "Case 9 insurance excluded from net worth",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      insurancePolicies: [{ id: "p1", name: "Excluded", includeInNetWorth: false, currentCashValue: 9999, cashValueCurrency: "TWD", currentFx: 1 }]
    },
    expected: { cash: 1000, investments: 0, insurance: 0, liabilities: 0, assets: 1000, netWorth: 1000, cashPercent: 100, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 10 paid liability excluded",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      liabilities: [{ id: "l1", name: "Paid", currentBalance: 999, currency: "TWD", currentFx: 1, status: "paidOff" }]
    },
    expected: { cash: 1000, investments: 0, insurance: 0, liabilities: 0, assets: 1000, netWorth: 1000, cashPercent: 100, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 11 quantity zero position excluded",
    state: { positions: [{ stockId: "stock-zero", currency: "TWD", currentFx: 1 }] },
    positions: [{ stockId: "stock-zero", shares: 0, currency: "TWD", marketValueBase: 9999 }],
    expected: { cash: 0, investments: 0, insurance: 0, liabilities: 0, assets: 0, netWorth: 0, cashPercent: 0, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 12 archived position excluded",
    state: { positions: [{ stockId: "stock-archived", currency: "TWD", currentFx: 1, isArchived: true }] },
    positions: [{ stockId: "stock-archived", shares: 5, currency: "TWD", marketValueBase: 9999 }],
    expected: { cash: 0, investments: 0, insurance: 0, liabilities: 0, assets: 0, netWorth: 0, cashPercent: 0, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 13 current FX equals 1",
    state: {
      financialAccounts: [{ id: "usd", name: "USD Cash", currency: "USD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "usd", amount: 100, balanceDate: "2026-07-01" }]
    },
    expected: { cash: 100, investments: 0, insurance: 0, liabilities: 0, assets: 100, netWorth: 100, cashPercent: 100, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 14 invalid current FX",
    state: {
      financialAccounts: [{ id: "usd", name: "USD Cash", currency: "USD", currentFx: 0 }],
      accountBalances: [{ id: "b1", accountId: "usd", amount: 100, balanceDate: "2026-07-01" }]
    },
    expected: { cash: 0, investments: 0, insurance: 0, liabilities: 0, assets: 0, netWorth: 0, cashPercent: 0, investmentPercent: 0, insurancePercent: 0 }
  },
  {
    name: "Case 15 exchange rate null does not affect dashboard calculation",
    state: {
      financialAccounts: [{ id: "cash", name: "Cash", currency: "TWD", currentFx: 1 }],
      accountBalances: [{ id: "b1", accountId: "cash", amount: 1000, balanceDate: "2026-07-01" }],
      positions: [{ stockId: "stock-a", currency: "TWD", currentFx: 1 }],
      transactions: [{ id: "tx-null-fx", stockId: "stock-a", type: "buy", exchangeRate: null, date: "2026-07-01" }]
    },
    positions: [{ stockId: "stock-a", shares: 1, currency: "TWD", marketValueBase: 200 }],
    expected: { cash: 1000, investments: 200, insurance: 0, liabilities: 0, assets: 1200, netWorth: 1200, cashPercent: 83.3333, investmentPercent: 16.6667, insurancePercent: 0 }
  }
];

calculationCases.forEach(assertDashboard);

const warningState = makeState({
  financialAccounts: [
    { id: "no-balance", name: "No Balance", currency: "TWD", currentFx: 1 },
    { id: "bad-fx", name: "Bad FX", currency: "USD", currentFx: 0 },
    { id: "bad-currency", name: "Bad Currency", currency: "EUR", currentFx: 1 }
  ],
  accountBalances: [{ id: "bad-fx-balance", accountId: "bad-fx", amount: 10, balanceDate: "2026-07-01" }],
  insurancePolicies: [{ id: "empty-policy", name: "Empty Policy", includeInNetWorth: true, currentCashValue: 0, cashValueCurrency: "TWD", currentFx: 1 }],
  liabilities: [{ id: "bad-liability", name: "Bad Liability", currentBalance: -1, currency: "TWD", currentFx: 1, status: "active" }],
  positions: [{ stockId: "stock-bad", currency: "USD", currentFx: 0 }]
});
const warningService = makeService(warningState, [
  { stockId: "stock-zero", shares: 0, currency: "TWD", marketValueBase: 0 },
  { stockId: "stock-bad", shares: -1, currency: "USD", marketValueBase: -10 },
  { stockId: "stock-a", shares: 1, currency: "TWD", marketValueBase: -5 }
]);
const warnings = warningService.getWarnings();
["Balance", "Current FX", "Currency", "Cash Value", "Current Balance", "Quantity", "Market Value"].forEach((keyword) => {
  assert(warnings.some((warning) => warning.message.includes(keyword)), `missing warning keyword: ${keyword}`);
});
assert.doesNotThrow(() => JSON.stringify(warningService.getDashboardSummary()));

const activities = makeService(makeState({
  financialAccounts: Array.from({ length: 12 }, (_, index) => ({ id: `a${index}`, name: `Account ${index}`, currency: "TWD", currentFx: 1, updatedAt: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z` }))
})).getLatestActivity();
assert.strictEqual(activities.length, 10);
assert.strictEqual(activities[0].title, "Updated Account 11");

const PF = global.PersonalFinanceDomain;
const repoState = makeState();
const repo = PF.createRepository(repoState, () => {}, { now: () => "2026-07-27T00:00:00.000Z" });
const account = repo.createAccount({ id: "account", name: "Account", type: "bank", currency: "TWD", currentFx: 1, purpose: "daily" });

["EUR", "JPY", "GBP", "HKD", "CNY", "KRW", "AUD", "CAD", "???"].forEach((currency) => {
  assert.throws(() => repo.createAccount({ name: `Bad ${currency}`, type: "bank", currency, currentFx: 1, purpose: "daily" }), /不支援|å¹£|支援/);
});
["NaN", Infinity, -1].forEach((amount) => assert.throws(() => repo.createBalance({ accountId: account.id, amount, balanceDate: "2026-07-01" })));
["", 0, -1, Infinity, "NaN"].forEach((currentFx) => assert.throws(() => repo.createAccount({ name: "USD Bad FX", type: "bank", currency: "USD", currentFx, purpose: "daily" })));
assert.doesNotThrow(() => repo.createAccount({ name: "TWD Null FX", type: "bank", currency: "TWD", currentFx: "", purpose: "daily" }));
assert.throws(() => repo.createPolicy({ name: "Bad Cash Value", category: "life", paymentFrequency: "annual", cashValueCurrency: "TWD", currentFx: 1, currentCashValue: -1, status: "active" }));
assert.throws(() => repo.createPolicy({ name: "Bad Cash Value Infinity", category: "life", paymentFrequency: "annual", cashValueCurrency: "TWD", currentFx: 1, currentCashValue: Infinity, status: "active" }));
assert.throws(() => repo.createLiability({ name: "Bad Balance", type: "personalLoan", currency: "TWD", currentFx: 1, currentBalance: -1, status: "active" }));
assert.throws(() => repo.createLiability({ name: "Bad Balance NaN", type: "personalLoan", currency: "TWD", currentFx: 1, currentBalance: "NaN", status: "active" }));
assert.doesNotThrow(() => warningService.getWarnings());

global.localStorage = (() => {
  const memory = {};
  return {
    memory,
    getItem: (key) => memory[key] ?? null,
    setItem: (key, value) => { memory[key] = value; }
  };
})();
require("../js/data.js");
require("../js/storage.js");

global.localStorage.memory["coreSatellite.watchlistStocks"] = JSON.stringify([{ id: "legacy-stock", ticker: "LEG", companyName: "Legacy" }]);
global.localStorage.memory["coreSatellite.positions"] = JSON.stringify([{ stockId: "legacy-stock", shares: 3, averageCost: 10, currentPrice: 20 }]);
global.localStorage.memory["coreSatellite.transactions"] = JSON.stringify([{ id: "legacy-tx", stockId: "legacy-stock", ticker: "LEG", date: "2026-07-01", type: "buy", shares: 1, price: 10 }]);
global.localStorage.memory["personalFinance.financialAccounts"] = JSON.stringify([{ id: "legacy-account", name: "Legacy Account", type: "bank" }]);
global.localStorage.memory["personalFinance.accountBalances"] = JSON.stringify([{ id: "legacy-balance", accountId: "legacy-account", amount: 100, balanceDate: "2026-07-01" }]);
global.localStorage.memory["personalFinance.insurancePolicies"] = JSON.stringify([{ id: "legacy-policy", name: "Legacy Policy", includeInNetWorth: true, currentCashValue: 100 }]);
global.localStorage.memory["personalFinance.liabilities"] = JSON.stringify([{ id: "legacy-liability", name: "Legacy Liability", currentBalance: 50 }]);

const migrated = global.AppStorage.load();
assert.strictEqual(migrated.watchlistStocks[0].id, "legacy-stock");
assert.strictEqual(migrated.watchlistStocks[0].currency, "TWD");
assert.strictEqual(migrated.positions[0].stockId, "legacy-stock");
assert.strictEqual(migrated.positions[0].currentFx, 1);
assert.strictEqual(migrated.transactions[0].id, "legacy-tx");
assert.strictEqual(migrated.transactions[0].exchangeRate, null);
assert.strictEqual(migrated.financialAccounts[0].id, "legacy-account");
assert.strictEqual(migrated.financialAccounts[0].currency, "TWD");
assert.strictEqual(migrated.financialAccounts[0].currentFx, 1);
assert.strictEqual(migrated.insurancePolicies[0].id, "legacy-policy");
assert.strictEqual(migrated.insurancePolicies[0].cashValueCurrency, "TWD");
assert.strictEqual(migrated.insurancePolicies[0].currentFx, 1);
assert.strictEqual(migrated.liabilities[0].id, "legacy-liability");
assert.strictEqual(migrated.liabilities[0].currency, "TWD");
assert.strictEqual(migrated.liabilities[0].currentFx, 1);

global.localStorage.memory["coreSatellite.positions"] = JSON.stringify(migrated.positions);
global.localStorage.memory["coreSatellite.transactions"] = JSON.stringify(migrated.transactions);
const migratedAgain = global.AppStorage.load();
assert.strictEqual(migratedAgain.positions.length, migrated.positions.length);
assert.strictEqual(migratedAgain.transactions.length, migrated.transactions.length);
assert.deepStrictEqual(migratedAgain.positions.map((item) => item.stockId), migrated.positions.map((item) => item.stockId));
assert.deepStrictEqual(migratedAgain.transactions.map((item) => item.id), migrated.transactions.map((item) => item.id));

console.log("Milestone C calculation layer unit tests passed.");
