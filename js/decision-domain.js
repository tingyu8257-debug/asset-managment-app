(function (root) {
  const DECISION_TYPES = [
    "watch",
    "buy",
    "add",
    "hold",
    "reduce",
    "sell",
    "avoid",
    "reEnter",
    "thesisUpdate",
    "exitPlanUpdate",
    "research",
    "review"
  ];

  const EXECUTION_STATUSES = ["planned", "executed", "partiallyExecuted", "cancelled", "notExecuted"];
  const DEFAULT_TEMPLATE_TYPE = "review";

  const DECISION_TEMPLATES = {
    watch: {
      title: "Watch Decision",
      description: "先放入觀察，不代表買入；重點是記錄為什麼值得追蹤，以及下一步要看什麼。",
      fields: ["stockId", "date", "entryType", "executionStatus", "title", "investmentThesis", "expectedOutcome", "supportingEvidence", "plannedAction", "nextReviewDate", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "expectedOutcome"],
      defaults: { executionStatus: "planned", plannedAction: "等待更多資訊後再決定是否深入研究" },
      labels: {
        investmentThesis: "Watch Reason *",
        expectedOutcome: "What to Monitor *",
        supportingEvidence: "Key Catalysts",
        plannedAction: "Next Action",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "為什麼這家公司值得放進觀察清單？",
        expectedOutcome: "接下來要追蹤哪些營運、估值、題材或產業變化？",
        supportingEvidence: "可能讓研究優先順序提高的催化因素。",
        plannedAction: "例如：等財報、等價格進入區間、先讀年報。",
        followUpReview: "其他觀察備註。"
      }
    },
    buy: {
      title: "Buy Decision",
      description: "買入前確認 thesis、證據、風險、反證條件與計畫進場方式。",
      fields: ["stockId", "date", "entryType", "executionStatus", "transactionId", "thesisVersionId", "title", "investmentThesis", "supportingEvidence", "expectedOutcome", "risks", "invalidationConditions", "price", "quantity", "holdingPeriod", "expectedReturn", "confidence", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "expectedOutcome", "risks", "confidence"],
      defaults: { executionStatus: "planned" },
      labels: {
        investmentThesis: "Investment Thesis *",
        supportingEvidence: "Supporting Evidence",
        expectedOutcome: "Expected Catalysts *",
        risks: "Risks *",
        invalidationConditions: "Invalidation Conditions",
        price: "Planned Entry Price",
        quantity: "Planned Quantity",
        holdingPeriod: "Expected Holding Period",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "買入的主要投資理由是什麼？",
        supportingEvidence: "支持這個決策的資料、研究、財報或觀察。",
        expectedOutcome: "你期待哪些催化劑或結果發生？",
        risks: "這筆決策最可能錯在哪裡？",
        invalidationConditions: "什麼情況發生時，代表 thesis 需要被推翻？"
      }
    },
    add: {
      base: "buy",
      title: "Add Position Decision",
      description: "加碼前確認原本 thesis 是否更強，或只是因價格波動而衝動加碼。",
      labels: {
        investmentThesis: "Add Thesis *",
        expectedOutcome: "Expected Catalysts *",
        price: "Planned Add Price",
        quantity: "Planned Add Quantity"
      },
      placeholders: {
        investmentThesis: "為什麼現在適合加碼，而不是只維持原部位？"
      }
    },
    hold: {
      title: "Hold Decision",
      description: "持有不是不做事；記錄為什麼繼續持有，以及下次要檢查什麼。",
      fields: ["stockId", "date", "entryType", "executionStatus", "thesisVersionId", "title", "investmentThesis", "thesisStillValid", "risks", "supportingEvidence", "nextReviewDate", "confidence", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "risks", "confidence"],
      defaults: { executionStatus: "notExecuted" },
      labels: {
        investmentThesis: "Why Continue Holding *",
        thesisStillValid: "Thesis Still Valid",
        risks: "Current Risks *",
        supportingEvidence: "Key Metrics to Watch",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "繼續持有的理由是什麼？",
        risks: "目前主要風險是否有變化？",
        supportingEvidence: "接下來要追蹤的指標、財報項目或事件。"
      }
    },
    reduce: {
      title: "Reduce Decision",
      description: "減碼時記錄是風險控管、估值變化、集中度，還是 thesis 弱化。",
      fields: ["stockId", "date", "entryType", "executionStatus", "transactionId", "title", "investmentThesis", "positionAdjustment", "expectedOutcome", "supportingEvidence", "risks", "price", "quantity", "confidence", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "risks", "confidence"],
      defaults: { executionStatus: "planned" },
      labels: {
        investmentThesis: "Reduce Reason *",
        positionAdjustment: "Position Sizing Reason",
        expectedOutcome: "Valuation View",
        supportingEvidence: "Remaining Thesis",
        risks: "Risks *",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "為什麼減碼？",
        positionAdjustment: "部位大小、集中度或風險控管考量。",
        expectedOutcome: "目前估值看法如何？",
        supportingEvidence: "減碼後仍保留部位的理由。"
      }
    },
    sell: {
      title: "Sell Decision",
      description: "退出時記錄 thesis 是否破裂、目標是否達成，以及之後要學到什麼。",
      fields: ["stockId", "date", "entryType", "executionStatus", "transactionId", "title", "investmentThesis", "thesisStillValid", "expectedOutcome", "risks", "supportingEvidence", "positionAdjustment", "price", "quantity", "confidence", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "risks", "confidence"],
      defaults: { executionStatus: "planned" },
      labels: {
        investmentThesis: "Exit Reason *",
        thesisStillValid: "Thesis Broken?",
        expectedOutcome: "Goal Achieved?",
        risks: "Risk Change *",
        supportingEvidence: "Valuation Change",
        positionAdjustment: "Position Closed?",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "為什麼要退出？",
        expectedOutcome: "原本的目標是否已達成？",
        risks: "風險是否升高或已不可接受？",
        supportingEvidence: "估值或基本面有什麼變化？"
      }
    },
    avoid: {
      title: "Avoid Decision",
      description: "避免買入也是一種決策；記錄排除理由和未來重新考慮條件。",
      fields: ["stockId", "date", "entryType", "executionStatus", "title", "investmentThesis", "invalidationConditions", "risks", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "risks"],
      defaults: { executionStatus: "notExecuted" },
      labels: {
        investmentThesis: "Avoid Reason *",
        invalidationConditions: "Required Conditions Before Reconsideration",
        risks: "Main Risks *",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "為什麼目前不碰？",
        invalidationConditions: "什麼條件改變後才會重新考慮？",
        risks: "主要疑慮或不能接受的風險。"
      }
    },
    thesisUpdate: {
      title: "Thesis Update Decision",
      description: "更新 thesis 時保留前後脈絡，避免事後忘記為什麼改變看法。",
      fields: ["stockId", "date", "entryType", "executionStatus", "thesisVersionId", "title", "investmentThesis", "expectedOutcome", "supportingEvidence", "researchId", "followUpReview", "tags"],
      required: ["date", "entryType", "executionStatus", "investmentThesis", "expectedOutcome"],
      defaults: { executionStatus: "notExecuted" },
      labels: {
        investmentThesis: "Updated Thesis *",
        expectedOutcome: "Change Summary *",
        supportingEvidence: "Change Reason",
        researchId: "Related Research",
        followUpReview: "Notes"
      },
      placeholders: {
        investmentThesis: "新的 thesis 是什麼？",
        expectedOutcome: "這次主要更新了哪些觀點？",
        supportingEvidence: "為什麼需要更新 thesis？"
      }
    },
    reEnter: {
      base: "buy",
      title: "Re-enter Decision",
      description: "重新進場前確認條件是否真的改變，而不是只是重新追高。",
      labels: {
        investmentThesis: "Re-enter Thesis *",
        price: "Planned Re-entry Price"
      }
    },
    exitPlanUpdate: {
      base: "sell",
      title: "Exit Plan Update",
      description: "調整退出計畫時記錄條件、風險和價格區間。"
    },
    research: {
      base: "watch",
      title: "Research Decision",
      description: "用於記錄研究方向和下一步要補的資料。"
    },
    review: {
      base: "hold",
      title: "Review Decision",
      description: "用於定期回顧目前 thesis 和風險是否仍然成立。"
    }
  };

  const LEGACY_TYPE_MAP = {
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

  function splitTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    return String(value || "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  }

  function normalizeDecisionType(type) {
    const value = String(type || "").trim();
    if (DECISION_TYPES.includes(value)) return value;
    return LEGACY_TYPE_MAP[value] || "review";
  }

  function mergeTemplate(type, seen = new Set()) {
    const normalizedType = normalizeDecisionType(type || DEFAULT_TEMPLATE_TYPE);
    const template = DECISION_TEMPLATES[normalizedType] || DECISION_TEMPLATES[DEFAULT_TEMPLATE_TYPE];
    if (!template.base || seen.has(template.base)) return { ...template, type: normalizedType };
    seen.add(template.base);
    const base = mergeTemplate(template.base, seen);
    return {
      ...base,
      ...template,
      type: normalizedType,
      fields: template.fields || base.fields,
      required: template.required || base.required,
      defaults: { ...(base.defaults || {}), ...(template.defaults || {}) },
      labels: { ...(base.labels || {}), ...(template.labels || {}) },
      placeholders: { ...(base.placeholders || {}), ...(template.placeholders || {}) }
    };
  }

  function getDecisionTemplate(type) {
    return mergeTemplate(type);
  }

  function getTemplateRequiredFields(type) {
    return new Set(getDecisionTemplate(type).required || []);
  }

  function normalizeExecutionStatus(status, transactionId = "") {
    const value = String(status || "").trim();
    if (EXECUTION_STATUSES.includes(value)) return value;
    return transactionId ? "executed" : "planned";
  }

  function normalizeDecision(entry = {}, state = { watchlistStocks: [] }) {
    const stockId = entry.companyId || entry.stockId || state.watchlistStocks?.find((stock) => stock.ticker === entry.ticker)?.id || "";
    const stock = state.watchlistStocks?.find((item) => item.id === stockId);
    const decisionType = normalizeDecisionType(entry.decisionType || entry.entryType);
    const decisionDate = entry.decisionDate || entry.date || "";
    const reason = entry.reason || entry.investmentThesis || entry.thesis || entry.summary || "";
    const notes = entry.notes || entry.note || entry.followUpReview || "";
    return {
      ...entry,
      id: entry.id || "",
      companyId: stockId,
      stockId,
      ticker: entry.ticker || stock?.ticker || "",
      companyName: stock?.companyName || entry.companyName || "",
      decisionType,
      entryType: decisionType,
      decisionDate,
      date: decisionDate,
      reason,
      investmentThesis: entry.investmentThesis || reason,
      title: entry.title || `${decisionType} Decision`,
      supportingEvidence: entry.supportingEvidence || "",
      risks: entry.risks || "",
      invalidationConditions: entry.invalidationConditions || "",
      confidence: normalizeConfidence(entry.confidence),
      plannedAction: entry.plannedAction || "",
      executionStatus: normalizeExecutionStatus(entry.executionStatus, entry.transactionId),
      price: normalizeOptionalPositiveNumber(entry.price),
      quantity: normalizeOptionalPositiveNumber(entry.quantity),
      expectedReturn: entry.expectedReturn || "",
      expectedHoldingPeriod: entry.expectedHoldingPeriod || entry.holdingPeriod || "",
      holdingPeriod: entry.holdingPeriod || entry.expectedHoldingPeriod || "",
      researchId: entry.researchId || "",
      thesisVersionId: entry.thesisVersionId || "",
      nextReviewDate: entry.nextReviewDate || "",
      transactionId: entry.transactionId || "",
      tags: splitTags(entry.tags),
      notes,
      note: entry.note || notes,
      followUpReview: entry.followUpReview || notes,
      expectedOutcome: entry.expectedOutcome || entry.catalysts || "",
      isArchived: Boolean(entry.isArchived || entry.isDeleted),
      isDeleted: Boolean(entry.isDeleted),
      archivedAt: entry.archivedAt || entry.deletedAt || "",
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
    };
  }

  function normalizeConfidence(value) {
    const confidence = Number(value);
    return Number.isInteger(confidence) && confidence >= 1 && confidence <= 10 ? confidence : "";
  }

  function normalizeOptionalPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function validateDecision(input = {}) {
    const errors = [];
    const decisionType = normalizeDecisionType(input.entryType || input.decisionType);
    const required = getTemplateRequiredFields(decisionType);
    const confidence = Number(input.confidence);
    const price = input.price === "" || input.price === null || input.price === undefined ? null : Number(input.price);
    const quantity = input.quantity === "" || input.quantity === null || input.quantity === undefined ? null : Number(input.quantity);
    if (!input.date && !input.decisionDate) errors.push("日期為必填。");
    if (!DECISION_TYPES.includes(decisionType)) errors.push("Decision Type 不正確。");
    if (!EXECUTION_STATUSES.includes(normalizeExecutionStatus(input.executionStatus, input.transactionId))) errors.push("Execution Status 不正確。");
    if (required.has("investmentThesis") && !String(input.investmentThesis || input.reason || "").trim()) errors.push("Investment Thesis / Why 為必填。");
    if (required.has("expectedOutcome") && !String(input.expectedOutcome || "").trim()) errors.push("Expected Outcome 為必填。");
    if (required.has("risks") && !String(input.risks || "").trim()) errors.push("Risks 為必填。");
    if (required.has("confidence") && (!Number.isInteger(confidence) || confidence < 1 || confidence > 10)) errors.push("Confidence 必須是 1 到 10 的整數。");
    if (!required.has("confidence") && input.confidence !== "" && input.confidence !== undefined && input.confidence !== null && (!Number.isInteger(confidence) || confidence < 1 || confidence > 10)) errors.push("Confidence 必須是 1 到 10 的整數。");
    if (price !== null && (!Number.isFinite(price) || price <= 0)) errors.push("Price 若有填寫，必須大於 0。");
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) errors.push("Quantity 若有填寫，必須大於 0。");
    return { valid: errors.length === 0, errors };
  }
  function comparePlannedExecuted(decision, transaction) {
    if (!transaction) return { hasTransaction: false, statusText: "尚未連結交易" };
    const plannedPrice = decision.price;
    const plannedQuantity = decision.quantity;
    const executedPrice = normalizeOptionalPositiveNumber(transaction.price);
    const executedQuantity = normalizeOptionalPositiveNumber(transaction.shares);
    return {
      hasTransaction: true,
      plannedPrice,
      plannedQuantity,
      executedPrice,
      executedQuantity,
      priceDiff: plannedPrice !== null && executedPrice !== null ? executedPrice - plannedPrice : null,
      quantityDiff: plannedQuantity !== null && executedQuantity !== null ? executedQuantity - plannedQuantity : null,
      statusText: "已連結交易"
    };
  }

  function filterAndSortDecisions(entries, state, query = {}) {
    const keyword = String(query.keyword || "").trim().toLowerCase();
    const tag = String(query.tag || "").trim().toLowerCase();
    const list = entries
      .map((entry) => normalizeDecision(entry, state))
      .filter((entry) => query.includeArchived || !entry.isArchived)
      .filter((entry) => !query.companyId || entry.companyId === query.companyId)
      .filter((entry) => !query.type || entry.decisionType === query.type)
      .filter((entry) => !query.executionStatus || entry.executionStatus === query.executionStatus)
      .filter((entry) => !query.hasTransaction || (query.hasTransaction === "yes" ? Boolean(entry.transactionId) : !entry.transactionId))
      .filter((entry) => !query.dateFrom || entry.decisionDate >= query.dateFrom)
      .filter((entry) => !query.dateTo || entry.decisionDate <= query.dateTo)
      .filter((entry) => !tag || entry.tags.some((item) => item.toLowerCase().includes(tag)))
      .filter((entry) => {
        if (!keyword) return true;
        const haystack = [
          entry.ticker,
          entry.companyName,
          entry.title,
          entry.reason,
          entry.expectedOutcome,
          entry.risks,
          entry.notes,
          entry.tags.join(" ")
        ].join(" ").toLowerCase();
        return haystack.includes(keyword);
      });
    const sortBy = query.sortBy || "newest";
    const direction = query.sortDirection === "asc" || sortBy === "oldest" ? 1 : -1;
    return list.sort((a, b) => {
      if (sortBy === "confidence") return direction * ((Number(a.confidence) || 0) - (Number(b.confidence) || 0));
      if (sortBy === "updated") return direction * String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""));
      return direction * String(a.decisionDate || a.updatedAt || "").localeCompare(String(b.decisionDate || b.updatedAt || ""));
    });
  }

  function getLatestDecisionForStock(entries, state, stockId) {
    return filterAndSortDecisions(entries, state, { companyId: stockId, sortBy: "newest" })[0] || null;
  }

  function getPlannedDecisionsForStock(entries, state, stockId) {
    return filterAndSortDecisions(entries, state, { companyId: stockId })
      .filter((entry) => ["planned", "partiallyExecuted"].includes(entry.executionStatus));
  }

  function getThesisVersionOptions(stock = {}) {
    const history = Array.isArray(stock.thesisHistory) ? stock.thesisHistory : [];
    return history
      .map((item, index) => ({
        id: item.id || `thesis-${stock.id || "stock"}-${item.versionNumber || item.version || index + 1}`,
        versionNumber: Number(item.versionNumber || item.version || index + 1),
        label: `Version ${Number(item.versionNumber || item.version || index + 1)} · ${(item.createdAt || item.savedAt || "").slice(0, 10) || "尚未設定"}`,
        content: item.content || item.currentContent?.thesisSummary || item.thesisSummary || ""
      }))
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  function buildSummary(state, calculatePosition) {
    const decisions = filterAndSortDecisions(state.journalEntries || [], state, {});
    const positionsWithoutRecentDecision = (state.positions || [])
      .filter((position) => !position.isArchived && Number(calculatePosition?.(position.stockId)?.shares || 0) > 0)
      .filter((position) => {
        const latest = getLatestDecisionForStock(state.journalEntries || [], state, position.stockId);
        if (!latest) return true;
        const days = (Date.now() - new Date(latest.updatedAt || latest.decisionDate).getTime()) / 86400000;
        return Number.isFinite(days) && days > 90;
      });
    const watchlistWithoutThesis = (state.watchlistStocks || []).filter((stock) => {
      const text = String(stock.thesisSummary || stock.thesis || "").trim();
      return !text || text === "尚未設定";
    });
    return {
      recent: decisions.slice(0, 10),
      planned: decisions.filter((entry) => entry.executionStatus === "planned").slice(0, 10),
      awaitingExecution: decisions.filter((entry) => ["buy", "add", "reduce", "sell", "reEnter"].includes(entry.decisionType) && !entry.transactionId && entry.executionStatus === "planned").slice(0, 10),
      executed: decisions.filter((entry) => entry.executionStatus === "executed" || entry.transactionId).slice(0, 10),
      thesisUpdates: decisions.filter((entry) => entry.decisionType === "thesisUpdate").slice(0, 10),
      positionsWithoutRecentDecision,
      watchlistWithoutThesis
    };
  }

  root.DecisionDomain = {
    DECISION_TYPES,
    EXECUTION_STATUSES,
    normalizeDecisionType,
    normalizeExecutionStatus,
    getDecisionTemplate,
    normalizeDecision,
    validateDecision,
    splitTags,
    comparePlannedExecuted,
    filterAndSortDecisions,
    getLatestDecisionForStock,
    getPlannedDecisionsForStock,
    getThesisVersionOptions,
    buildSummary
  };
})(typeof window !== "undefined" ? window : globalThis);
