(typeof window !== "undefined" ? window : globalThis).CashFlowDomain = (() => {
  const SCHEMA_VERSION = 1;
  const SUPPORTED_CURRENCIES = ["TWD", "USD"];
  const INCOME_CATEGORY_DEFAULTS = ["Salary", "Bonus", "Dividend", "Interest", "Rental", "Gift", "Other"];
  const EXPENSE_CATEGORY_DEFAULTS = ["Food", "Transportation", "Housing", "Utilities", "Insurance", "Healthcare", "Education", "Travel", "Shopping", "Entertainment", "Subscription", "Tax", "Investment Fee", "Other"];
  const ENTRY_TYPES = ["income", "expense", "transfer"];
  const PAYMENT_METHODS = ["cash", "bank", "debitCard", "creditCard"];
  const TRANSFER_TYPES = ["assetToAsset", "assetToCreditCard"];
  const RECURRING_FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"];

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function text(value, fallback = "") {
    return String(value ?? "").trim() || fallback;
  }

  function tags(value) {
    if (Array.isArray(value)) return value.map(text).filter(Boolean);
    return text(value).split(",").map(text).filter(Boolean);
  }

  function moneyNumber(value, label = "金額") {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label}必須大於 0。`);
    return number;
  }

  function optionalMoneyNumber(value, fallback = 0) {
    if (value === "" || value === null || value === undefined) return fallback;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function currency(value) {
    const next = text(value, "TWD").toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(next)) throw new Error("幣別只能是 TWD 或 USD。");
    return next;
  }

  function exchangeRate(value, nextCurrency) {
    const number = Number(value);
    if (nextCurrency === "TWD" && (value === "" || value === null || value === undefined)) return 1;
    if (!Number.isFinite(number) || number <= 0) throw new Error("Exchange Rate 必須大於 0。");
    return number;
  }

  function normalizeDate(value, label = "日期") {
    const next = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) throw new Error(`${label}為必填，格式需為 YYYY-MM-DD。`);
    return next;
  }

  function addPeriod(dateString, frequency) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    if (frequency === "weekly") date.setDate(date.getDate() + 7);
    if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
    if (frequency === "quarterly") date.setMonth(date.getMonth() + 3);
    if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }

  function ensureDefaultCategories(categories, defaults, type) {
    const existingNames = new Set((Array.isArray(categories) ? categories : []).map((item) => text(item.name).toLowerCase()));
    const defaultRows = defaults
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name, index) => normalizeCategory({ id: `${type}-category-${name.toLowerCase().replace(/\s+/g, "-")}`, type, name, displayOrder: index }));
    return [...(Array.isArray(categories) ? categories : []), ...defaultRows].map((item, index) => normalizeCategory({ ...item, type: item.type || type, displayOrder: item.displayOrder ?? index }));
  }

  function normalizeCategory(input = {}) {
    const categoryType = ["income", "expense"].includes(input.type) ? input.type : "expense";
    return {
      id: text(input.id, makeId(`${categoryType}-category`)),
      type: categoryType,
      name: text(input.name, "Other"),
      isArchived: Boolean(input.isArchived),
      displayOrder: Number.isFinite(Number(input.displayOrder)) ? Number(input.displayOrder) : 0,
      createdAt: input.createdAt || now(),
      updatedAt: input.updatedAt || input.createdAt || now()
    };
  }

  function normalizeEntry(input = {}) {
    const type = ENTRY_TYPES.includes(input.type) ? input.type : "expense";
    const entryCurrency = currency(input.currency);
    return {
      id: text(input.id, makeId("cash-flow")),
      type,
      date: normalizeDate(input.date || new Date().toISOString().slice(0, 10)),
      amount: moneyNumber(input.amount),
      currency: entryCurrency,
      exchangeRate: exchangeRate(input.exchangeRate ?? input.fxRateAtEntry, entryCurrency),
      categoryId: text(input.categoryId),
      paymentMethod: PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : "",
      accountId: text(input.accountId),
      toAccountId: text(input.toAccountId),
      liabilityId: text(input.liabilityId),
      transferType: TRANSFER_TYPES.includes(input.transferType) ? input.transferType : "",
      title: text(input.title),
      tags: tags(input.tags),
      note: text(input.note),
      sourceRecurringId: text(input.sourceRecurringId),
      createdAt: input.createdAt || now(),
      updatedAt: input.updatedAt || input.createdAt || now()
    };
  }

  function normalizeRecurring(input = {}) {
    const recurringType = ["income", "expense"].includes(input.type) ? input.type : "expense";
    const entryCurrency = currency(input.currency);
    const frequency = RECURRING_FREQUENCIES.includes(input.frequency) ? input.frequency : "monthly";
    return {
      id: text(input.id, makeId("recurring")),
      type: recurringType,
      title: text(input.title, recurringType === "income" ? "Recurring Income" : "Recurring Expense"),
      amount: moneyNumber(input.amount),
      currency: entryCurrency,
      exchangeRate: exchangeRate(input.exchangeRate ?? 1, entryCurrency),
      categoryId: text(input.categoryId),
      paymentMethod: PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : "",
      accountId: text(input.accountId),
      liabilityId: text(input.liabilityId),
      frequency,
      nextDueDate: normalizeDate(input.nextDueDate || new Date().toISOString().slice(0, 10), "下次到期日"),
      note: text(input.note),
      isArchived: Boolean(input.isArchived),
      createdAt: input.createdAt || now(),
      updatedAt: input.updatedAt || input.createdAt || now()
    };
  }

  function normalizeBudget(input = {}) {
    return {
      id: text(input.id, makeId("budget")),
      month: text(input.month, new Date().toISOString().slice(0, 7)),
      categoryId: text(input.categoryId),
      amount: optionalMoneyNumber(input.amount, 0),
      currency: currency(input.currency || "TWD"),
      exchangeRate: exchangeRate(input.exchangeRate ?? 1, currency(input.currency || "TWD")),
      createdAt: input.createdAt || now(),
      updatedAt: input.updatedAt || input.createdAt || now()
    };
  }

  function normalizeStateParts(parts = {}) {
    return {
      incomeCategories: ensureDefaultCategories(parts.incomeCategories, INCOME_CATEGORY_DEFAULTS, "income"),
      expenseCategories: ensureDefaultCategories(parts.expenseCategories, EXPENSE_CATEGORY_DEFAULTS, "expense"),
      cashFlowEntries: Array.isArray(parts.cashFlowEntries) ? parts.cashFlowEntries.map(normalizeEntry) : [],
      recurringCashFlows: Array.isArray(parts.recurringCashFlows) ? parts.recurringCashFlows.map(normalizeRecurring) : [],
      monthlyBudgets: Array.isArray(parts.monthlyBudgets) ? parts.monthlyBudgets.map(normalizeBudget) : []
    };
  }

  function createRepository(state, savePart, options = {}) {
    const getNow = options.now || now;
    const save = (name) => typeof savePart === "function" && savePart(name, state[name]);

    function getLatestBalance(accountId) {
      return [...(state.accountBalances || [])]
        .filter((balance) => balance.accountId === accountId)
        .sort((a, b) => `${b.balanceDate}-${b.updatedAt}-${b.id}`.localeCompare(`${a.balanceDate}-${a.updatedAt}-${a.id}`))[0] || null;
    }

    function appendBalance(accountId, amount, date, note) {
      const account = state.financialAccounts.find((item) => item.id === accountId && !item.isArchived);
      if (!account) throw new Error("找不到有效的付款帳戶。");
      if (amount < 0) throw new Error("帳戶餘額不可小於 0。");
      state.accountBalances.push({
        id: makeId("balance"),
        accountId,
        amount,
        balanceDate: date,
        note,
        createdAt: getNow(),
        updatedAt: getNow()
      });
      save("accountBalances");
      return account;
    }

    function adjustAccount(accountId, delta, date, note) {
      const latest = getLatestBalance(accountId);
      const nextAmount = (latest ? Number(latest.amount) : 0) + delta;
      return appendBalance(accountId, Math.max(0, nextAmount), date, note);
    }

    function adjustLiability(liabilityId, delta, note) {
      const liability = state.liabilities.find((item) => item.id === liabilityId && !item.isArchived);
      if (!liability) throw new Error("找不到有效的信用卡負債。");
      liability.currentBalance = Math.max(0, Number(liability.currentBalance || 0) + delta);
      liability.status = liability.currentBalance === 0 ? "paidOff" : "active";
      liability.note = note ? `${liability.note ? `${liability.note}\n` : ""}${note}` : liability.note;
      liability.updatedAt = getNow();
      save("liabilities");
      return liability;
    }

    function validateCategory(input, type, existingId = "") {
      const category = normalizeCategory({ ...input, id: existingId || input.id || makeId(`${type}-category`), type, updatedAt: getNow() });
      if (!category.name) throw new Error("分類名稱為必填。");
      const target = type === "income" ? state.incomeCategories : state.expenseCategories;
      if (target.some((item) => item.id !== existingId && item.name.toLowerCase() === category.name.toLowerCase())) throw new Error("分類名稱已存在。");
      return category;
    }

    function createCategory(type, input) {
      const category = validateCategory(input, type);
      const key = type === "income" ? "incomeCategories" : "expenseCategories";
      state[key].push(category);
      save(key);
      return category;
    }

    function updateCategory(type, id, input) {
      const key = type === "income" ? "incomeCategories" : "expenseCategories";
      const index = state[key].findIndex((item) => item.id === id);
      if (index === -1) throw new Error("找不到要編輯的分類。");
      state[key][index] = validateCategory({ ...state[key][index], ...input }, type, id);
      save(key);
      return state[key][index];
    }

    function archiveCategory(type, id, archived = true) {
      const key = type === "income" ? "incomeCategories" : "expenseCategories";
      const category = state[key].find((item) => item.id === id);
      if (!category) throw new Error("找不到分類。");
      category.isArchived = archived;
      category.updatedAt = getNow();
      save(key);
      return category;
    }

    function validateEntry(input) {
      const entry = normalizeEntry({ ...input, updatedAt: getNow() });
      if (entry.type === "income" && !entry.accountId) throw new Error("Income 必須選擇入帳帳戶。");
      if (entry.type === "expense") {
        if (!entry.paymentMethod) throw new Error("Expense 必須選擇付款方式。");
        if (entry.paymentMethod === "creditCard" && !entry.liabilityId) throw new Error("信用卡支出必須選擇信用卡負債。");
        if (entry.paymentMethod !== "creditCard" && !entry.accountId) throw new Error("現金、銀行或 Debit Card 支出必須選擇付款帳戶。");
      }
      if (entry.type === "transfer") {
        if (!entry.transferType) throw new Error("Transfer 必須選擇轉帳類型。");
        if (!entry.accountId) throw new Error("Transfer 必須選擇轉出帳戶。");
        if (entry.transferType === "assetToAsset" && !entry.toAccountId) throw new Error("Asset → Asset 必須選擇轉入帳戶。");
        if (entry.transferType === "assetToCreditCard" && !entry.liabilityId) throw new Error("信用卡繳款必須選擇信用卡負債。");
      }
      return entry;
    }

    function applyEntrySideEffect(entry) {
      if (entry.type === "income") adjustAccount(entry.accountId, entry.amount, entry.date, `Income: ${entry.title || entry.note || "收入"}`);
      if (entry.type === "expense" && entry.paymentMethod === "creditCard") adjustLiability(entry.liabilityId, entry.amount, `Credit Card Expense: ${entry.title || entry.note || "支出"}`);
      if (entry.type === "expense" && entry.paymentMethod !== "creditCard") adjustAccount(entry.accountId, -entry.amount, entry.date, `Expense: ${entry.title || entry.note || "支出"}`);
      if (entry.type === "transfer" && entry.transferType === "assetToAsset") {
        adjustAccount(entry.accountId, -entry.amount, entry.date, `Transfer out: ${entry.title || "轉帳"}`);
        adjustAccount(entry.toAccountId, entry.amount, entry.date, `Transfer in: ${entry.title || "轉帳"}`);
      }
      if (entry.type === "transfer" && entry.transferType === "assetToCreditCard") {
        adjustAccount(entry.accountId, -entry.amount, entry.date, `Credit card payment: ${entry.title || "信用卡繳款"}`);
        adjustLiability(entry.liabilityId, -entry.amount, `Credit card payment: ${entry.title || "信用卡繳款"}`);
      }
    }

    function createEntry(input, options = {}) {
      const entry = validateEntry({ ...input, id: input.id || makeId("cash-flow"), createdAt: getNow(), updatedAt: getNow() });
      state.cashFlowEntries.push(entry);
      save("cashFlowEntries");
      if (!options.skipSideEffect) applyEntrySideEffect(entry);
      return entry;
    }

    function updateEntry(id, input) {
      const index = state.cashFlowEntries.findIndex((entry) => entry.id === id);
      if (index === -1) throw new Error("找不到要編輯的 Cash Flow Entry。");
      const next = validateEntry({ ...state.cashFlowEntries[index], ...input, id, updatedAt: getNow() });
      state.cashFlowEntries[index] = next;
      save("cashFlowEntries");
      return next;
    }

    function deleteEntry(id) {
      const before = state.cashFlowEntries.length;
      state.cashFlowEntries = state.cashFlowEntries.filter((entry) => entry.id !== id);
      if (before !== state.cashFlowEntries.length) save("cashFlowEntries");
    }

    function createRecurring(input) {
      const recurring = normalizeRecurring({ ...input, id: input.id || makeId("recurring"), createdAt: getNow(), updatedAt: getNow() });
      state.recurringCashFlows.push(recurring);
      save("recurringCashFlows");
      return recurring;
    }

    function updateRecurring(id, input) {
      const index = state.recurringCashFlows.findIndex((item) => item.id === id);
      if (index === -1) throw new Error("找不到要編輯的 Recurring。");
      state.recurringCashFlows[index] = normalizeRecurring({ ...state.recurringCashFlows[index], ...input, id, updatedAt: getNow() });
      save("recurringCashFlows");
      return state.recurringCashFlows[index];
    }

    function archiveRecurring(id, archived = true) {
      const recurring = state.recurringCashFlows.find((item) => item.id === id);
      if (!recurring) throw new Error("找不到 Recurring。");
      recurring.isArchived = archived;
      recurring.updatedAt = getNow();
      save("recurringCashFlows");
      return recurring;
    }

    function confirmRecurring(id) {
      const recurring = state.recurringCashFlows.find((item) => item.id === id && !item.isArchived);
      if (!recurring) throw new Error("找不到可確認的 Recurring。");
      const entry = createEntry({
        type: recurring.type,
        date: recurring.nextDueDate,
        amount: recurring.amount,
        currency: recurring.currency,
        exchangeRate: recurring.exchangeRate,
        categoryId: recurring.categoryId,
        paymentMethod: recurring.paymentMethod,
        accountId: recurring.accountId,
        liabilityId: recurring.liabilityId,
        title: recurring.title,
        note: recurring.note,
        sourceRecurringId: recurring.id
      });
      recurring.nextDueDate = addPeriod(recurring.nextDueDate, recurring.frequency);
      recurring.updatedAt = getNow();
      save("recurringCashFlows");
      return entry;
    }

    function upsertBudget(input) {
      const budget = normalizeBudget({ ...input, updatedAt: getNow() });
      const existing = state.monthlyBudgets.findIndex((item) => item.month === budget.month && item.categoryId === budget.categoryId);
      if (existing >= 0) state.monthlyBudgets[existing] = { ...state.monthlyBudgets[existing], ...budget, id: state.monthlyBudgets[existing].id, updatedAt: getNow() };
      else state.monthlyBudgets.push(budget);
      save("monthlyBudgets");
      return budget;
    }

    return {
      createCategory,
      updateCategory,
      archiveCategory,
      restoreCategory: (type, id) => archiveCategory(type, id, false),
      createEntry,
      updateEntry,
      deleteEntry,
      createRecurring,
      updateRecurring,
      archiveRecurring,
      restoreRecurring: (id) => archiveRecurring(id, false),
      confirmRecurring,
      upsertBudget,
      getLatestBalance
    };
  }

  return {
    SCHEMA_VERSION,
    INCOME_CATEGORY_DEFAULTS,
    EXPENSE_CATEGORY_DEFAULTS,
    ENTRY_TYPES,
    PAYMENT_METHODS,
    TRANSFER_TYPES,
    RECURRING_FREQUENCIES,
    normalizeStateParts,
    normalizeCategory,
    normalizeEntry,
    normalizeRecurring,
    normalizeBudget,
    createRepository
  };
})();
