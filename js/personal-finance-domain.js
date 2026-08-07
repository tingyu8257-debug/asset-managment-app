(typeof window !== "undefined" ? window : globalThis).PersonalFinanceDomain = (() => {
  const SCHEMA_VERSION = 2;
  const ACCOUNT_TYPES = ["cash", "bank", "brokerageCash", "eWallet", "cryptoCash", "other"];
  const ACCOUNT_PURPOSES = ["daily", "emergencyFund", "savings", "coreInvestment", "satelliteInvestment", "trading", "retirement", "settlement", "overseas", "other"];
  const POLICY_CATEGORIES = ["medical", "cancer", "longTermCare", "life", "accident", "savings", "annuity", "other"];
  const POLICY_STATUSES = ["active", "paidUp", "expired", "cancelled", "unknown"];
  const PAYMENT_FREQUENCIES = ["monthly", "quarterly", "semiannual", "annual", "single", "other"];
  const LIABILITY_TYPES = ["mortgage", "personalLoan", "creditCard", "studentLoan", "marginLoan", "familyLoan", "other"];
  const LIABILITY_STATUSES = ["active", "paidOff", "unknown"];
  const DEFAULT_CURRENCIES = ["TWD", "USD"];

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function text(value, fallback = "") {
    return String(value ?? "").trim() || fallback;
  }

  function bool(value) {
    return Boolean(value);
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function nonNegativeNumber(value, fallback = 0) {
    const number = numberOrNull(value);
    return number !== null && number >= 0 ? number : fallback;
  }

  function numberWithDefault(value, fallback = 0) {
    const number = numberOrNull(value);
    return number !== null ? number : fallback;
  }

  function assertFiniteNonNegativeInput(value, label, required = false) {
    if (value === "" || value === null || value === undefined) {
      if (required) throw new Error(`${label}必須是有效且不小於 0 的數字，不可為負數。`);
      return;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${label}必須是有效且不小於 0 的數字，不可為負數。`);
  }

  function validDate(value) {
    if (!value) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  }

  function assertValidDate(value, label, required = false) {
    if (required && !value) throw new Error(`${label}為必填欄位。`);
    if (value && !validDate(value)) throw new Error(`${label}格式不正確。`);
  }

  function assertCurrency(currency, supportedCurrencies = DEFAULT_CURRENCIES) {
    if (!currency) throw new Error("幣別為必填欄位。");
    if (!supportedCurrencies.includes(currency)) throw new Error(`不支援的幣別：${currency}`);
  }

  function normalizeCurrency(value) {
    const currency = text(value, "TWD").toUpperCase();
    return DEFAULT_CURRENCIES.includes(currency) ? currency : "TWD";
  }

  function normalizeCurrentFx(value, currency) {
    const number = numberOrNull(value);
    return number !== null && number > 0 ? number : 1;
  }

  function assertCurrentFx(currentFx, currency) {
    if (currency === "TWD") return;
    if (!Number.isFinite(currentFx) || currentFx <= 0) throw new Error("USD 目前估值匯率必須大於 0。");
  }

  function assertInputCurrentFx(value, currency) {
    if (currency === "TWD") {
      if (value === "" || value === null || value === undefined) return;
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) throw new Error("目前估值匯率必須大於 0。");
      return;
    }
    const number = Number(value);
    if (value === "" || value === null || value === undefined || !Number.isFinite(number) || number <= 0) throw new Error("USD 目前估值匯率必須大於 0。");
  }

  function ensureUniqueIds(items, prefix) {
    const used = new Set();
    return (Array.isArray(items) ? items : []).map((item, index) => {
      const candidate = text(item?.id) || `${prefix}-legacy-${index}`;
      const id = used.has(candidate) ? `${candidate}-${index}` : candidate;
      used.add(id);
      return { ...item, id };
    });
  }

  function normalizeAccount(input = {}, index = 0) {
    const createdAt = input.createdAt || now();
    return {
      id: text(input.id, `account-${index}`),
      name: text(input.name, "尚未命名帳戶"),
      type: ACCOUNT_TYPES.includes(input.type) ? input.type : "other",
      customTypeName: text(input.customTypeName),
      subtype: text(input.subtype),
      institution: text(input.institution, "尚未設定"),
      countryOrRegion: text(input.countryOrRegion, "尚未設定"),
      currency: normalizeCurrency(input.currency),
      currentFx: normalizeCurrentFx(input.currentFx, normalizeCurrency(input.currency)),
      purpose: ACCOUNT_PURPOSES.includes(input.purpose) ? input.purpose : "other",
      customPurposeName: text(input.customPurposeName),
      linkedAccountId: text(input.linkedAccountId),
      displayOrder: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : index,
      note: text(input.note),
      isArchived: bool(input.isArchived),
      createdAt,
      updatedAt: input.updatedAt || createdAt
    };
  }

  function normalizeBalance(input = {}, index = 0) {
    const createdAt = input.createdAt || now();
    return {
      id: text(input.id, `balance-${index}`),
      accountId: text(input.accountId),
      amount: numberWithDefault(input.amount, 0),
      balanceDate: text(input.balanceDate, new Date().toISOString().slice(0, 10)),
      note: text(input.note),
      createdAt,
      updatedAt: input.updatedAt || createdAt
    };
  }

  function normalizePolicy(input = {}, index = 0) {
    const createdAt = input.createdAt || now();
    return {
      id: text(input.id, `policy-${index}`),
      name: text(input.name, "尚未命名保單"),
      insurer: text(input.insurer, "尚未設定"),
      category: POLICY_CATEGORIES.includes(input.category) ? input.category : "other",
      customCategoryName: text(input.customCategoryName),
      insuredPerson: text(input.insuredPerson),
      policyholder: text(input.policyholder),
      beneficiaryNote: text(input.beneficiaryNote),
      paymentFrequency: PAYMENT_FREQUENCIES.includes(input.paymentFrequency) ? input.paymentFrequency : "other",
      customPaymentFrequencyName: text(input.customPaymentFrequencyName),
      premiumAmount: numberWithDefault(input.premiumAmount, 0),
      nextPaymentDate: text(input.nextPaymentDate),
      paymentEndDate: text(input.paymentEndDate),
      coverageSummary: text(input.coverageSummary),
      coverageAmount: numberWithDefault(input.coverageAmount, 0),
      currentCashValue: numberWithDefault(input.currentCashValue, 0),
      cashValueCurrency: normalizeCurrency(input.cashValueCurrency),
      currentFx: normalizeCurrentFx(input.currentFx, normalizeCurrency(input.cashValueCurrency)),
      cashValueDate: text(input.cashValueDate),
      includeInNetWorth: bool(input.includeInNetWorth),
      status: POLICY_STATUSES.includes(input.status) ? input.status : "unknown",
      customPolicyStatusName: text(input.customPolicyStatusName),
      note: text(input.note),
      isArchived: bool(input.isArchived),
      createdAt,
      updatedAt: input.updatedAt || createdAt
    };
  }

  function normalizeLiability(input = {}, index = 0) {
    const createdAt = input.createdAt || now();
    const balance = numberWithDefault(input.currentBalance, numberWithDefault(input.balance, 0));
    return {
      id: text(input.id, `liability-${index}`),
      name: text(input.name, "尚未命名負債"),
      type: LIABILITY_TYPES.includes(input.type) ? input.type : "other",
      customTypeName: text(input.customTypeName),
      lender: text(input.lender, "尚未設定"),
      currency: normalizeCurrency(input.currency),
      currentFx: normalizeCurrentFx(input.currentFx, normalizeCurrency(input.currency)),
      currentBalance: balance,
      originalAmount: numberWithDefault(input.originalAmount, balance),
      interestRate: numberWithDefault(input.interestRate, 0),
      minimumPayment: numberWithDefault(input.minimumPayment, 0),
      nextPaymentDate: text(input.nextPaymentDate),
      dueDate: text(input.dueDate),
      status: LIABILITY_STATUSES.includes(input.status) ? input.status : (balance === 0 ? "paidOff" : "active"),
      customLiabilityStatusName: text(input.customLiabilityStatusName),
      note: text(input.note),
      isArchived: bool(input.isArchived),
      createdAt,
      updatedAt: input.updatedAt || createdAt
    };
  }

  function normalizeStateParts(parts = {}) {
    const financialAccounts = ensureUniqueIds(parts.financialAccounts, "account").map(normalizeAccount);
    const accountIds = new Set(financialAccounts.map((account) => account.id));
    const accountBalances = ensureUniqueIds(parts.accountBalances, "balance")
      .map(normalizeBalance)
      .filter((balance) => accountIds.has(balance.accountId));
    const insurancePolicies = ensureUniqueIds(parts.insurancePolicies, "policy").map(normalizePolicy);
    const liabilities = ensureUniqueIds(parts.liabilities, "liability").map(normalizeLiability);
    return { financialAccounts, accountBalances, insurancePolicies, liabilities };
  }

  function validateAccount(input, accounts, existingId = "") {
    const inputCurrency = text(input.currency, "TWD").toUpperCase();
    assertCurrency(inputCurrency);
    assertInputCurrentFx(input.currentFx, inputCurrency);
    const account = normalizeAccount({ ...input, id: input.id || existingId || makeId("account") });
    if (!account.name) throw new Error("帳戶名稱為必填欄位。");
    if (!ACCOUNT_TYPES.includes(account.type)) throw new Error("帳戶類型不正確。");
    if (!ACCOUNT_PURPOSES.includes(account.purpose)) throw new Error("帳戶用途不正確。");
    if (account.type === "other" && !account.customTypeName) throw new Error("請輸入自訂帳戶類型名稱。");
    if (account.purpose === "other" && !account.customPurposeName) throw new Error("請輸入自訂帳戶用途名稱。");
    assertCurrency(account.currency);
    assertCurrentFx(account.currentFx, account.currency);
    if (accounts.some((item) => item.id === account.id && item.id !== existingId)) throw new Error("帳戶 id 重複。");
    if (account.linkedAccountId) {
      if (account.linkedAccountId === account.id) throw new Error("帳戶不能連結到自己。");
      if (!accounts.some((item) => item.id === account.linkedAccountId)) throw new Error("連結帳戶不存在。");
      if (createsLinkCycle(accounts, account.id, account.linkedAccountId)) throw new Error("連結帳戶不能形成循環。");
    }
    return account;
  }

  function createsLinkCycle(accounts, accountId, linkedAccountId) {
    const nextById = new Map(accounts.map((account) => [account.id, account.linkedAccountId]));
    nextById.set(accountId, linkedAccountId);
    let current = linkedAccountId;
    const visited = new Set();
    while (current) {
      if (current === accountId || visited.has(current)) return true;
      visited.add(current);
      current = nextById.get(current);
    }
    return false;
  }

  function validateBalance(input, accounts, existingId = "") {
    assertFiniteNonNegativeInput(input.amount, "餘額", true);
    const balance = normalizeBalance({ ...input, id: input.id || existingId || makeId("balance") });
    if (!accounts.some((account) => account.id === balance.accountId)) throw new Error("餘額所屬帳戶不存在。");
    if (accounts.find((account) => account.id === balance.accountId)?.isArchived) throw new Error("已封存帳戶不能新增或修改餘額。");
    if (!Number.isFinite(balance.amount) || balance.amount < 0) throw new Error("餘額必須是不小於 0 的數字。");
    assertValidDate(balance.balanceDate, "餘額日期", true);
    return balance;
  }

  function validatePolicy(input, supportedCurrencies = DEFAULT_CURRENCIES, existingId = "") {
    const inputCurrency = text(input.cashValueCurrency, "TWD").toUpperCase();
    assertCurrency(inputCurrency, supportedCurrencies);
    assertInputCurrentFx(input.currentFx, inputCurrency);
    assertFiniteNonNegativeInput(input.premiumAmount, "保費");
    assertFiniteNonNegativeInput(input.coverageAmount, "保障金額");
    assertFiniteNonNegativeInput(input.currentCashValue, "目前保單價值");
    const policy = normalizePolicy({ ...input, id: input.id || existingId || makeId("policy") });
    if (!policy.name) throw new Error("保單名稱為必填欄位。");
    if (!POLICY_CATEGORIES.includes(policy.category)) throw new Error("保單類別不正確。");
    if (!PAYMENT_FREQUENCIES.includes(policy.paymentFrequency)) throw new Error("繳費頻率不正確。");
    if (!POLICY_STATUSES.includes(policy.status)) throw new Error("保單狀態不正確。");
    if (policy.category === "other" && !policy.customCategoryName) throw new Error("請輸入自訂保單類別名稱。");
    if (policy.paymentFrequency === "other" && !policy.customPaymentFrequencyName) throw new Error("請輸入自訂繳費頻率。");
    assertCurrency(policy.cashValueCurrency, supportedCurrencies);
    assertCurrentFx(policy.currentFx, policy.cashValueCurrency);
    ["premiumAmount", "coverageAmount", "currentCashValue"].forEach((key) => {
      if (!Number.isFinite(policy[key]) || policy[key] < 0) throw new Error("保單金額不可為負數。");
    });
    assertValidDate(policy.nextPaymentDate, "下次繳費日期");
    assertValidDate(policy.paymentEndDate, "繳費結束日期");
    assertValidDate(policy.cashValueDate, "保單價值日期");
    return policy;
  }

  function validateLiability(input, supportedCurrencies = DEFAULT_CURRENCIES, existingId = "") {
    const inputCurrency = text(input.currency, "TWD").toUpperCase();
    assertCurrency(inputCurrency, supportedCurrencies);
    assertInputCurrentFx(input.currentFx, inputCurrency);
    assertFiniteNonNegativeInput(input.currentBalance, "目前負債餘額", true);
    assertFiniteNonNegativeInput(input.originalAmount, "原始負債金額");
    assertFiniteNonNegativeInput(input.interestRate, "利率");
    assertFiniteNonNegativeInput(input.minimumPayment, "最低付款");
    const liability = normalizeLiability({ ...input, id: input.id || existingId || makeId("liability") });
    if (!liability.name) throw new Error("負債名稱為必填欄位。");
    if (!LIABILITY_TYPES.includes(liability.type)) throw new Error("負債類型不正確。");
    if (liability.type === "other" && !liability.customTypeName) throw new Error("請輸入自訂負債類型名稱。");
    assertCurrency(liability.currency, supportedCurrencies);
    assertCurrentFx(liability.currentFx, liability.currency);
    ["currentBalance", "originalAmount", "interestRate", "minimumPayment"].forEach((key) => {
      if (!Number.isFinite(liability[key]) || liability[key] < 0) throw new Error("負債數字不可為負數。");
    });
    assertValidDate(liability.nextPaymentDate, "下次付款日期");
    assertValidDate(liability.dueDate, "到期日期");
    return liability;
  }

  function sortLatestBalance(a, b) {
    const byDate = String(b.balanceDate).localeCompare(String(a.balanceDate));
    if (byDate) return byDate;
    const byUpdated = String(b.updatedAt).localeCompare(String(a.updatedAt));
    if (byUpdated) return byUpdated;
    return String(b.id).localeCompare(String(a.id));
  }

  function createRepository(state, savePart, options = {}) {
    const getNow = options.now || now;
    const save = (name) => {
      if (typeof savePart === "function") savePart(name, state[name]);
    };
    const currencies = () => DEFAULT_CURRENCIES;

    function activeAccounts(includeArchived = false) {
      return state.financialAccounts
        .filter((account) => includeArchived || !account.isArchived)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
    }

    function accountById(id) {
      return state.financialAccounts.find((account) => account.id === id);
    }

    function createAccount(input) {
      const account = validateAccount({ ...input, createdAt: getNow(), updatedAt: getNow() }, state.financialAccounts);
      state.financialAccounts.push(account);
      save("financialAccounts");
      return account;
    }

    function updateAccount(id, input) {
      const index = state.financialAccounts.findIndex((account) => account.id === id);
      if (index === -1) throw new Error("找不到要編輯的帳戶。");
      const account = validateAccount({ ...state.financialAccounts[index], ...input, id, updatedAt: getNow() }, state.financialAccounts, id);
      state.financialAccounts[index] = account;
      save("financialAccounts");
      return account;
    }

    function archiveAccount(id, archived = true) {
      const account = accountById(id);
      if (!account) throw new Error("找不到帳戶。");
      account.isArchived = archived;
      account.updatedAt = getNow();
      save("financialAccounts");
      return account;
    }

    function deleteAccount(id) {
      const account = accountById(id);
      if (!account) throw new Error("找不到帳戶。");
      state.financialAccounts = state.financialAccounts
        .filter((item) => item.id !== id)
        .map((item) => item.linkedAccountId === id ? { ...item, linkedAccountId: "", updatedAt: getNow() } : item);
      state.accountBalances = state.accountBalances.filter((balance) => balance.accountId !== id);
      save("financialAccounts");
      save("accountBalances");
      return account;
    }

    function balancesByAccountId(accountId) {
      return state.accountBalances
        .filter((balance) => balance.accountId === accountId)
        .sort(sortLatestBalance);
    }

    function latestBalance(accountId) {
      return balancesByAccountId(accountId)[0] || null;
    }

    function latestBalancesGroupedByCurrency(includeArchived = false) {
      return activeAccounts(includeArchived).reduce((groups, account) => {
        const latest = latestBalance(account.id);
        if (!latest) return groups;
        groups[account.currency] = (groups[account.currency] || 0) + latest.amount;
        return groups;
      }, {});
    }

    function createBalance(input) {
      const balance = validateBalance({ ...input, createdAt: getNow(), updatedAt: getNow() }, state.financialAccounts);
      state.accountBalances.push(balance);
      save("accountBalances");
      return balance;
    }

    function updateBalance(id, input) {
      const index = state.accountBalances.findIndex((balance) => balance.id === id);
      if (index === -1) throw new Error("找不到要編輯的餘額。");
      const balance = validateBalance({ ...state.accountBalances[index], ...input, id, updatedAt: getNow() }, state.financialAccounts, id);
      state.accountBalances[index] = balance;
      save("accountBalances");
      return balance;
    }

    function deleteBalance(id) {
      const index = state.accountBalances.findIndex((balance) => balance.id === id);
      if (index === -1) throw new Error("找不到要刪除的餘額。");
      const [removed] = state.accountBalances.splice(index, 1);
      save("accountBalances");
      return removed;
    }

    function createPolicy(input) {
      const policy = validatePolicy({ ...input, createdAt: getNow(), updatedAt: getNow() }, currencies());
      state.insurancePolicies.push(policy);
      save("insurancePolicies");
      return policy;
    }

    function updatePolicy(id, input) {
      const index = state.insurancePolicies.findIndex((policy) => policy.id === id);
      if (index === -1) throw new Error("找不到要編輯的保單。");
      const policy = validatePolicy({ ...state.insurancePolicies[index], ...input, id, updatedAt: getNow() }, currencies(), id);
      state.insurancePolicies[index] = policy;
      save("insurancePolicies");
      return policy;
    }

    function archivePolicy(id, archived = true) {
      const policy = state.insurancePolicies.find((item) => item.id === id);
      if (!policy) throw new Error("找不到保單。");
      policy.isArchived = archived;
      policy.updatedAt = getNow();
      save("insurancePolicies");
      return policy;
    }

    function deletePolicy(id) {
      const index = state.insurancePolicies.findIndex((policy) => policy.id === id);
      if (index === -1) throw new Error("找不到要刪除的保單。");
      const [removed] = state.insurancePolicies.splice(index, 1);
      save("insurancePolicies");
      return removed;
    }

    function createLiability(input) {
      const liability = validateLiability({ ...input, createdAt: getNow(), updatedAt: getNow() }, currencies());
      state.liabilities.push(liability);
      save("liabilities");
      return liability;
    }

    function updateLiability(id, input) {
      const index = state.liabilities.findIndex((liability) => liability.id === id);
      if (index === -1) throw new Error("找不到要編輯的負債。");
      const liability = validateLiability({ ...state.liabilities[index], ...input, id, updatedAt: getNow() }, currencies(), id);
      state.liabilities[index] = liability;
      save("liabilities");
      return liability;
    }

    function archiveLiability(id, archived = true) {
      const liability = state.liabilities.find((item) => item.id === id);
      if (!liability) throw new Error("找不到負債。");
      liability.isArchived = archived;
      liability.updatedAt = getNow();
      save("liabilities");
      return liability;
    }

    function markLiabilityPaidOff(id) {
      return updateLiability(id, { currentBalance: 0, status: "paidOff" });
    }

    function deleteLiability(id) {
      const index = state.liabilities.findIndex((liability) => liability.id === id);
      if (index === -1) throw new Error("找不到要刪除的負債。");
      const [removed] = state.liabilities.splice(index, 1);
      save("liabilities");
      return removed;
    }

    return {
      getAllAccounts: activeAccounts,
      getAccountById: accountById,
      getBalancesByAccountId: balancesByAccountId,
      getLatestBalanceByAccountId: latestBalance,
      getLatestBalancesGroupedByCurrency: latestBalancesGroupedByCurrency,
      createAccount,
      updateAccount,
      archiveAccount,
      restoreAccount: (id) => archiveAccount(id, false),
      deleteAccount,
      createBalance,
      updateBalance,
      deleteBalance,
      createPolicy,
      updatePolicy,
      archivePolicy,
      restorePolicy: (id) => archivePolicy(id, false),
      deletePolicy,
      createLiability,
      updateLiability,
      archiveLiability,
      restoreLiability: (id) => archiveLiability(id, false),
      markLiabilityPaidOff,
      deleteLiability
    };
  }

  function validateImportObject(payload = {}) {
    const parts = normalizeStateParts(payload);
    const ids = new Set();
    [...parts.financialAccounts, ...parts.accountBalances, ...parts.insurancePolicies, ...parts.liabilities].forEach((item) => {
      if (ids.has(item.id)) throw new Error(`匯入資料含有重複 id：${item.id}`);
      ids.add(item.id);
    });
    return parts;
  }

  return {
    SCHEMA_VERSION,
    ACCOUNT_TYPES,
    ACCOUNT_PURPOSES,
    POLICY_CATEGORIES,
    POLICY_STATUSES,
    PAYMENT_FREQUENCIES,
    LIABILITY_TYPES,
    LIABILITY_STATUSES,
    normalizeStateParts,
    normalizeAccount,
    normalizeBalance,
    normalizePolicy,
    normalizeLiability,
    validateAccount,
    validateBalance,
    validatePolicy,
    validateLiability,
    validateImportObject,
    createRepository
  };
})();
