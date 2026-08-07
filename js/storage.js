window.AppStorage = (() => {
  const KEYS = {
    personalFinanceSchemaVersion: "personalFinance.schemaVersion",
    settings: "coreSatellite.settings",
    watchlistStocks: "coreSatellite.watchlistStocks",
    positions: "coreSatellite.positions",
    transactions: "coreSatellite.transactions",
    journalEntries: "coreSatellite.journalEntries",
    investmentReviews: "coreSatellite.investmentReviews",
    investmentLessons: "coreSatellite.investmentLessons",
    financialAccounts: "personalFinance.financialAccounts",
    accountBalances: "personalFinance.accountBalances",
    insurancePolicies: "personalFinance.insurancePolicies",
    liabilities: "personalFinance.liabilities",
    incomeCategories: "cashFlow.incomeCategories",
    expenseCategories: "cashFlow.expenseCategories",
    cashFlowEntries: "cashFlow.entries",
    recurringCashFlows: "cashFlow.recurring",
    monthlyBudgets: "cashFlow.monthlyBudgets"
  };
  const LEGACY_MARKET_DATA_KEY = "coreSatellite.marketData";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(rawValue, fallback) {
    if (!rawValue) return clone(fallback);
    try {
      const parsed = JSON.parse(rawValue);
      return parsed ?? clone(fallback);
    } catch (error) {
      console.warn("localStorage 資料解析失敗，改用預設值。", error);
      return clone(fallback);
    }
  }

  function readFirstAvailable(keys, fallback) {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return safeParse(value, fallback);
    }
    return clone(fallback);
  }

  function normalizeStock(stock, index, baseCurrency) {
    const thesisSummary = stock.thesisSummary || stock.thesis || stock.investmentReason || "尚未設定";
    const mainRisks = stock.mainRisks || stock.risk || stock.maxRisk || "尚未設定";
    const invalidationConditions = stock.invalidationConditions || stock.invalidation || stock.counterEvidence || "尚未設定";
    const stockId = stock.id || `stock-${String(stock.ticker || index).toLowerCase()}`;
    const lastUpdated = stock.lastReviewedAt || stock.lastUpdatedDate || new Date().toISOString().slice(0, 10);
    const thesisHistory = normalizeThesisHistory(stock.thesisHistory, stockId, {
      thesisSummary,
      catalysts: stock.catalysts || "尚未設定",
      mainRisks,
      invalidationConditions,
      thesisStatus: stock.thesisStatus || "active",
      savedAt: lastUpdated
    });
    return {
      id: stockId,
      ticker: stock.ticker || stock.symbol || "未設定",
      companyName: stock.companyName || stock.name || "尚未設定",
      currency: normalizeCurrency(stock.currency || baseCurrency),
      market: stock.market || "尚未設定",
      industry: stock.industry || "尚未設定",
      tags: Array.isArray(stock.tags) ? stock.tags : [],
      stage: stock.stage || stock.status || "初步發現",
      thesis: stock.thesis || thesisSummary,
      risk: stock.risk || mainRisks,
      invalidation: stock.invalidation || invalidationConditions,
      businessOverview: stock.businessOverview || "",
      growthDrivers: stock.growthDrivers || "",
      competitiveAdvantages: stock.competitiveAdvantages || "",
      valuationNotes: stock.valuationNotes || "",
      sources: Array.isArray(stock.sources) ? stock.sources : String(stock.sources || "").split(/[\n,，]/).map((source) => source.trim()).filter(Boolean),
      researchNotes: stock.researchNotes || stock.notes || "",
      fairPriceRange: stock.fairPriceRange || "尚未設定",
      targetBuyPriceLow: Number(stock.targetBuyPriceLow) > 0 ? Number(stock.targetBuyPriceLow) : null,
      targetBuyPriceHigh: Number(stock.targetBuyPriceHigh) > 0 ? Number(stock.targetBuyPriceHigh) : null,
      reviewPrice: Number(stock.reviewPrice) > 0 ? Number(stock.reviewPrice) : null,
      priceAlertNote: stock.priceAlertNote || "",
      nextReviewDate: stock.nextReviewDate || "",
      lastUpdatedDate: stock.lastUpdatedDate || "",
      thesisSummary,
      expectedTimeHorizon: stock.expectedTimeHorizon || "尚未設定",
      catalysts: stock.catalysts || "尚未設定",
      mainRisks,
      invalidationConditions,
      thesisStatus: stock.thesisStatus || "active",
      lastReviewedAt: stock.lastReviewedAt || stock.lastUpdatedDate || "",
      thesisHistory
    };
  }

  function normalizeThesisHistory(history, stockId, currentThesis) {
    const source = Array.isArray(history) ? history : [];
    const base = source.length ? source : (currentThesis.thesisSummary && currentThesis.thesisSummary !== "尚未設定" ? [{
      version: 1,
      versionNumber: 1,
      savedAt: currentThesis.savedAt,
      thesisSummary: currentThesis.thesisSummary,
      catalysts: currentThesis.catalysts,
      mainRisks: currentThesis.mainRisks,
      invalidationConditions: currentThesis.invalidationConditions,
      thesisStatus: currentThesis.thesisStatus,
      changeReason: "Initial thesis migration",
      previousContent: {},
      currentContent: {
        thesisSummary: currentThesis.thesisSummary,
        catalysts: currentThesis.catalysts,
        mainRisks: currentThesis.mainRisks,
        invalidationConditions: currentThesis.invalidationConditions,
        thesisStatus: currentThesis.thesisStatus
      }
    }] : []);
    return base.map((item, historyIndex) => {
      const versionNumber = Number(item.versionNumber || item.version || historyIndex + 1);
      const content = item.content || item.currentContent?.thesisSummary || item.thesisSummary || "尚未設定";
      const createdAt = item.createdAt || item.savedAt || currentThesis.savedAt || "";
      return {
        ...item,
        id: item.id || `thesis-${stockId}-${versionNumber}`,
        companyId: item.companyId || stockId,
        version: versionNumber,
        versionNumber,
        savedAt: item.savedAt || createdAt,
        createdAt,
        content,
        thesisSummary: item.thesisSummary || content,
        catalysts: item.catalysts || item.currentContent?.catalysts || "尚未設定",
        mainRisks: item.mainRisks || item.currentContent?.mainRisks || "尚未設定",
        invalidationConditions: item.invalidationConditions || item.currentContent?.invalidationConditions || "尚未設定",
        thesisStatus: item.thesisStatus || item.currentContent?.thesisStatus || "active",
        changeSummary: item.changeSummary || item.changeReason || "尚未設定",
        changeReason: item.changeReason || item.changeSummary || "尚未設定",
        previousVersionId: item.previousVersionId || "",
        createdByDecisionId: item.createdByDecisionId || "",
        previousContent: item.previousContent || {},
        currentContent: item.currentContent || { thesisSummary: content },
        reviewDetails: item.reviewDetails || {}
      };
    });
  }

  function normalizeCurrency(value) {
    const currency = String(value || "TWD").trim().toUpperCase();
    return ["TWD", "USD"].includes(currency) ? currency : "TWD";
  }

  function normalizeCurrentFx(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 1;
  }
  function normalizeJournalType(type) {
    const legacyMap = {
      watchlistAdd: "watch",
      addPosition: "add",
      initialResearch: "research",
      deepResearch: "research",
      earningsReview: "review",
      priceReview: "review",
      addPositionReview: "add",
      reducePositionReview: "reduce",
      exitReview: "sell",
      periodicReview: "review",
      other: "review"
    };
    return ["watch", "buy", "add", "reduce", "sell", "hold", "avoid", "reEnter", "thesisUpdate", "exitPlanUpdate", "research", "review"].includes(type) ? type : legacyMap[type] || "review";
  }

  function normalizeExecutionStatus(status, transactionId) {
    return ["planned", "executed", "partiallyExecuted", "cancelled", "notExecuted"].includes(status) ? status : (transactionId ? "executed" : "planned");
  }

  function load() {
    const defaults = window.AppDefaults;
    const loadedSettings = readFirstAvailable([KEYS.settings, "settings"], defaults.settings);
    const settings = { ...defaults.settings, ...loadedSettings, exchangeRates: { ...defaults.settings.exchangeRates, ...(loadedSettings.exchangeRates || {}) } };
    settings.researchOutdatedDays = Number(settings.researchOutdatedDays) > 0 ? Number(settings.researchOutdatedDays) : 90;
    settings.baseCurrency = "TWD";
    settings.supportedCurrencies = ["TWD", "USD"];
    settings.exchangeRates = { TWD: 1, USD: normalizeCurrentFx(settings.exchangeRates?.USD) };
    const oldStocks = readFirstAvailable(
      [KEYS.watchlistStocks, "watchlistStocks", "stocks"],
      defaults.watchlistStocks
    );

    const watchlistStocks = (Array.isArray(oldStocks) ? oldStocks : defaults.watchlistStocks).map((stock, index) => normalizeStock(stock, index, settings.baseCurrency));
    const loadedPositions = readFirstAvailable([KEYS.positions, "positions"], defaults.positions);
    const loadedTransactions = readFirstAvailable([KEYS.transactions, "transactions"], defaults.transactions);
    const loadedJournalEntries = readFirstAvailable([KEYS.journalEntries, "journalEntries"], defaults.journalEntries);
    const loadedInvestmentReviews = readFirstAvailable([KEYS.investmentReviews, "investmentReviews"], defaults.investmentReviews || []);
    const loadedInvestmentLessons = readFirstAvailable([KEYS.investmentLessons, "investmentLessons"], defaults.investmentLessons || []);
    const loadedPersonalFinanceSchemaVersion = readFirstAvailable([KEYS.personalFinanceSchemaVersion], defaults.personalFinanceSchemaVersion || 2);
    const loadedFinancialAccounts = readFirstAvailable([KEYS.financialAccounts, "financialAccounts"], defaults.financialAccounts);
    const loadedAccountBalances = readFirstAvailable([KEYS.accountBalances, "accountBalances"], defaults.accountBalances);
    const loadedInsurancePolicies = readFirstAvailable([KEYS.insurancePolicies, "insurancePolicies"], defaults.insurancePolicies);
    const loadedLiabilities = readFirstAvailable([KEYS.liabilities, "liabilities"], defaults.liabilities);
    const loadedIncomeCategories = readFirstAvailable([KEYS.incomeCategories, "incomeCategories"], defaults.incomeCategories || []);
    const loadedExpenseCategories = readFirstAvailable([KEYS.expenseCategories, "expenseCategories"], defaults.expenseCategories || []);
    const loadedCashFlowEntries = readFirstAvailable([KEYS.cashFlowEntries, "cashFlowEntries"], defaults.cashFlowEntries || []);
    const loadedRecurringCashFlows = readFirstAvailable([KEYS.recurringCashFlows, "recurringCashFlows"], defaults.recurringCashFlows || []);
    const loadedMonthlyBudgets = readFirstAvailable([KEYS.monthlyBudgets, "monthlyBudgets"], defaults.monthlyBudgets || []);
    const loadedMarketData = readFirstAvailable([LEGACY_MARKET_DATA_KEY, "marketData"], []);
    const legacyMarketData = Array.isArray(loadedMarketData) ? loadedMarketData : [];
    const positions = Array.isArray(loadedPositions) ? loadedPositions.map((position) => ({
      stockId: position.stockId || position.id || watchlistStocks.find((stock) => stock.ticker === position.ticker)?.id,
      currentPrice: position.currentPrice ?? position.currentPriceLocal ?? legacyMarketData.find((item) => item.stockId === (position.stockId || position.id) || item.ticker === position.ticker)?.currentPrice ?? null,
      currency: normalizeCurrency(position.currency || watchlistStocks.find((stock) => stock.id === (position.stockId || position.id))?.currency || settings.baseCurrency),
      currentFx: normalizeCurrentFx(position.currentFx),
      isArchived: Boolean(position.isArchived),
      createdAt: position.createdAt || "",
      updatedAt: position.updatedAt || position.createdAt || ""
    })).filter((position) => position.stockId) : [];
    const transactions = Array.isArray(loadedTransactions) ? loadedTransactions.map((transaction, index) => ({
      ...transaction,
      id: transaction.id || `legacy-transaction-${index}`,
      stockId: transaction.stockId || watchlistStocks.find((stock) => stock.ticker === transaction.ticker)?.id,
      checkingCondition: transaction.checkingCondition || "",
      currency: normalizeCurrency(transaction.currency || watchlistStocks.find((stock) => stock.id === (transaction.stockId || watchlistStocks.find((item) => item.ticker === transaction.ticker)?.id))?.currency || settings.baseCurrency),
      exchangeRate: Number(transaction.exchangeRate) > 0 ? Number(transaction.exchangeRate) : null,
      fxRateAtTrade: Number(transaction.exchangeRate) > 0 ? Number(transaction.exchangeRate) : (Number(transaction.fxRateAtTrade) > 0 ? Number(transaction.fxRateAtTrade) : null),
      fxRateWasMissing: !(Number(transaction.exchangeRate) > 0 || Number(transaction.fxRateAtTrade) > 0),
      isDeleted: Boolean(transaction.isDeleted),
      deletedAt: transaction.deletedAt || "",
      editHistory: Array.isArray(transaction.editHistory) ? transaction.editHistory : [],
      journalEntryId: transaction.journalEntryId || ""
    })).filter((transaction) => transaction.stockId) : [];

    // 舊版若只存股數與平均成本，轉成一筆初始交易，保留原持倉。
    (Array.isArray(loadedPositions) ? loadedPositions : []).forEach((position, index) => {
      const stockId = position.stockId || position.id || watchlistStocks.find((stock) => stock.ticker === position.ticker)?.id;
      const alreadyHasTransactions = transactions.some((transaction) => transaction.stockId === stockId);
      if (stockId && !alreadyHasTransactions && Number(position.shares) > 0 && Number(position.averageCost) > 0) {
        transactions.push({
          id: `migrated-transaction-${index}`,
          stockId,
          ticker: position.ticker || watchlistStocks.find((stock) => stock.id === stockId)?.ticker,
          date: position.lastTransactionDate || new Date().toISOString().slice(0, 10),
          type: "buy",
          shares: Number(position.shares),
          price: Number(position.averageCost),
          reason: "由舊版持倉資料轉入",
          checkingCondition: "",
          note: "系統自動建立的相容紀錄",
          currency: normalizeCurrency(position.currency || settings.baseCurrency),
          exchangeRate: null,
          fxRateAtTrade: null,
          fxRateWasMissing: true
        });
      }
    });

    const personalFinanceParts = window.PersonalFinanceDomain
      ? window.PersonalFinanceDomain.normalizeStateParts({
        financialAccounts: loadedFinancialAccounts,
        accountBalances: loadedAccountBalances,
        insurancePolicies: loadedInsurancePolicies,
        liabilities: loadedLiabilities
      })
      : {
        financialAccounts: Array.isArray(loadedFinancialAccounts) ? loadedFinancialAccounts : [],
        accountBalances: Array.isArray(loadedAccountBalances) ? loadedAccountBalances : [],
        insurancePolicies: Array.isArray(loadedInsurancePolicies) ? loadedInsurancePolicies : [],
        liabilities: Array.isArray(loadedLiabilities) ? loadedLiabilities : []
      };
    const cashFlowParts = window.CashFlowDomain
      ? window.CashFlowDomain.normalizeStateParts({
        incomeCategories: loadedIncomeCategories,
        expenseCategories: loadedExpenseCategories,
        cashFlowEntries: loadedCashFlowEntries,
        recurringCashFlows: loadedRecurringCashFlows,
        monthlyBudgets: loadedMonthlyBudgets
      })
      : {
        incomeCategories: Array.isArray(loadedIncomeCategories) ? loadedIncomeCategories : [],
        expenseCategories: Array.isArray(loadedExpenseCategories) ? loadedExpenseCategories : [],
        cashFlowEntries: Array.isArray(loadedCashFlowEntries) ? loadedCashFlowEntries : [],
        recurringCashFlows: Array.isArray(loadedRecurringCashFlows) ? loadedRecurringCashFlows : [],
        monthlyBudgets: Array.isArray(loadedMonthlyBudgets) ? loadedMonthlyBudgets : []
      };

    return {
      personalFinanceSchemaVersion: Number(loadedPersonalFinanceSchemaVersion) || defaults.personalFinanceSchemaVersion || 2,
      settings,
      watchlistStocks,
      positions,
      transactions,
      journalEntries: Array.isArray(loadedJournalEntries) ? loadedJournalEntries.map((entry, index) => {
        const stockId = entry.stockId || watchlistStocks.find((stock) => stock.ticker === entry.ticker)?.id || "";
        const stock = watchlistStocks.find((item) => item.id === stockId);
        const investmentThesis = entry.investmentThesis || entry.thesis || entry.summary || "";
        const expectedOutcome = entry.expectedOutcome || entry.catalysts || "";
        const followUpReview = entry.followUpReview || entry.note || "";
        const confidence = Number(entry.confidence);
        const entryType = normalizeJournalType(entry.decisionType || entry.entryType);
        const transactionId = entry.transactionId || "";
        const quantity = Number(entry.quantity);
        return {
          id: entry.id || `legacy-journal-${index}`,
          companyId: stockId,
          stockId,
          ticker: entry.ticker || stock?.ticker || "",
          companyName: stock?.companyName || entry.companyName || "",
          date: entry.decisionDate || entry.date || "",
          decisionDate: entry.decisionDate || entry.date || "",
          entryType,
          decisionType: entryType,
          title: entry.title || "未命名決策紀錄",
          tags: Array.isArray(entry.tags) ? entry.tags : String(entry.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean),
          reason: entry.reason || investmentThesis,
          investmentThesis: investmentThesis || entry.reason || "",
          supportingEvidence: entry.supportingEvidence || "",
          expectedOutcome,
          risks: entry.risks || "",
          confidence: Number.isFinite(confidence) && confidence >= 1 && confidence <= 10 ? confidence : "",
          plannedAction: entry.plannedAction || "",
          executionStatus: normalizeExecutionStatus(entry.executionStatus, transactionId),
          followUpReview,
          expectedReturn: entry.expectedReturn || "",
          expectedHoldingPeriod: entry.expectedHoldingPeriod || entry.holdingPeriod || "",
          holdingPeriod: entry.holdingPeriod || entry.expectedHoldingPeriod || "",
          price: Number(entry.price) > 0 ? Number(entry.price) : null,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
          reviewType: entry.reviewType || "",
          thesisStillValid: entry.thesisStillValid || "",
          whatWentRight: entry.whatWentRight || "",
          whatWentWrong: entry.whatWentWrong || "",
          lessonsLearned: Array.isArray(entry.lessonsLearned) ? entry.lessonsLearned : [],
          positionAdjustment: entry.positionAdjustment || "",
          reviewNotes: entry.reviewNotes || "",
          summary: entry.summary || investmentThesis,
          thesis: entry.thesis || investmentThesis,
          catalysts: entry.catalysts || expectedOutcome,
          invalidationConditions: entry.invalidationConditions || "",
          nextReviewDate: entry.nextReviewDate || "",
          researchId: entry.researchId || "",
          thesisVersionId: entry.thesisVersionId || "",
          notes: entry.notes || entry.note || followUpReview,
          note: entry.note || entry.notes || followUpReview,
          transactionId,
          isArchived: Boolean(entry.isArchived || entry.isDeleted),
          archivedAt: entry.archivedAt || entry.deletedAt || "",
          isDeleted: Boolean(entry.isDeleted),
          createdAt: entry.createdAt || new Date().toISOString(),
          updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
        };
      }) : [],
      investmentReviews: normalizeInvestmentReviews(loadedInvestmentReviews, watchlistStocks, loadedJournalEntries, loadedTransactions),
      investmentLessons: normalizeInvestmentLessons(loadedInvestmentLessons, watchlistStocks, loadedInvestmentReviews),
      ...personalFinanceParts,
      ...cashFlowParts
    };
  }

  function splitTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    return String(value || "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  }

  function normalizeInvestmentReviews(rows, stocks, journals, transactions) {
    const source = Array.isArray(rows) ? rows : [];
    return source.map((review, index) => {
      const decision = (Array.isArray(journals) ? journals : []).find((entry) => entry.id === review.decisionId);
      const transaction = (Array.isArray(transactions) ? transactions : []).find((entry) => entry.id === (review.transactionId || decision?.transactionId));
      const companyId = review.companyId || review.stockId || decision?.stockId || transaction?.stockId || "";
      const stock = stocks.find((item) => item.id === companyId);
      const now = new Date().toISOString();
      return {
        id: review.id || `review-${index}`,
        companyId,
        stockId: companyId,
        ticker: review.ticker || stock?.ticker || decision?.ticker || "",
        companyName: review.companyName || stock?.companyName || decision?.companyName || "",
        decisionId: review.decisionId || "",
        transactionId: review.transactionId || decision?.transactionId || "",
        positionId: review.positionId || companyId,
        reviewDate: review.reviewDate || review.date || now.slice(0, 10),
        date: review.reviewDate || review.date || now.slice(0, 10),
        reviewType: review.reviewType || "customReview",
        outcome: review.outcome || "neutral",
        whatWentWell: review.whatWentWell || "",
        whatWentWrong: review.whatWentWrong || "",
        unexpectedEvents: review.unexpectedEvents || "",
        lessonsLearned: typeof review.lessonsLearned === "string" ? review.lessonsLearned : (Array.isArray(review.lessonsLearned) ? review.lessonsLearned.join(", ") : ""),
        nextImprovement: review.nextImprovement || "",
        confidenceReflection: review.confidenceReflection || "",
        notes: review.notes || review.note || "",
        note: review.note || review.notes || "",
        tags: splitTags(review.tags),
        reminderDate: review.reminderDate || review.nextReviewDate || "",
        isArchived: Boolean(review.isArchived),
        archivedAt: review.archivedAt || "",
        createdAt: review.createdAt || now,
        updatedAt: review.updatedAt || review.createdAt || now
      };
    });
  }

  function normalizeInvestmentLessons(rows, stocks, reviews) {
    const source = Array.isArray(rows) ? rows : [];
    return source.map((lesson, index) => {
      const relatedReviews = Array.isArray(lesson.relatedReviews) ? lesson.relatedReviews : splitTags(lesson.relatedReviews);
      const sourceReview = (Array.isArray(reviews) ? reviews : []).find((review) => review.id === relatedReviews[0]);
      const companyId = lesson.companyId || lesson.stockId || sourceReview?.companyId || "";
      const stock = stocks.find((item) => item.id === companyId);
      const now = new Date().toISOString();
      return {
        id: lesson.id || `lesson-${index}`,
        companyId,
        stockId: companyId,
        ticker: lesson.ticker || stock?.ticker || "",
        companyName: lesson.companyName || stock?.companyName || "",
        kind: ["lesson", "mistake", "success"].includes(lesson.kind || lesson.lessonKind) ? (lesson.kind || lesson.lessonKind) : "lesson",
        title: lesson.title || "",
        description: lesson.description || lesson.notes || "",
        category: lesson.category || "General",
        importance: lesson.importance || "medium",
        tags: splitTags(lesson.tags),
        relatedReviews,
        isReusable: lesson.isReusable !== false,
        isArchived: Boolean(lesson.isArchived),
        archivedAt: lesson.archivedAt || "",
        createdAt: lesson.createdAt || now,
        updatedAt: lesson.updatedAt || lesson.createdAt || now
      };
    });
  }

  function savePart(name, value) {
    if (!KEYS[name]) {
      console.error("未知的儲存名稱。", name);
      return false;
    }
    try {
      localStorage.setItem(KEYS[name], JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("無法儲存資料。", error);
      return false;
    }
  }

  function backup() {
    return JSON.stringify({
      kind: "core-satellite-offline-backup",
      schemaVersion: 5,
      appVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      data: load()
    }, null, 2);
  }

  function restore(serializedOrObject) {
    const parsed = typeof serializedOrObject === "string" ? JSON.parse(serializedOrObject) : serializedOrObject;
    const payload = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const current = load();
    const next = { ...current, ...payload };
    if (window.PersonalFinanceDomain) {
      Object.assign(next, window.PersonalFinanceDomain.validateImportObject(next));
      next.personalFinanceSchemaVersion = window.PersonalFinanceDomain.SCHEMA_VERSION;
    }
    Object.keys(KEYS).forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(next, name)) savePart(name, next[name]);
    });
    return load();
  }

  return { load, savePart, backup, restore, keys: KEYS };
})();

