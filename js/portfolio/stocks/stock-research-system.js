(typeof window !== "undefined" ? window : globalThis).StockResearchSystem = (() => {
  const DEFAULT_OUTDATED_DAYS = 90;
  const UNKNOWN_TEXT = "尚未設定";
  const REVIEW_ENTRY_TYPES = ["review", "thesisUpdate"];
  const OUTDATED_STATUSES = ["needsReview", "weakening", "invalidated"];
  const RESEARCH_STATUS = {
    upToDate: "upToDate",
    needsReview: "needsReview",
    outdated: "outdated",
    missing: "missing"
  };
  const LESSON_TAGS = [
    "FOMO",
    "Overconfidence",
    "Poor Valuation",
    "Ignored Risk",
    "Thesis Drift",
    "Position Too Large",
    "Sold Too Early",
    "Held Too Long",
    "No Exit Plan"
  ];

  function parseDate(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
  }

  function dateOnly(value) {
    return value ? String(value).slice(0, 10) : "";
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && parseDate(text) !== null ? text : "";
  }

  function daysSince(value, currentDate = new Date().toISOString().slice(0, 10)) {
    const start = parseDate(dateOnly(value));
    const end = parseDate(dateOnly(currentDate));
    if (start === null || end === null) return Infinity;
    return Math.max(0, Math.floor((end - start) / 86400000));
  }

  function isMissingText(value) {
    const text = String(value || "").trim();
    return !text || text === UNKNOWN_TEXT;
  }

  function normalizeSymbol(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function normalizeTags(value) {
    const tags = Array.isArray(value)
      ? value.map((tag) => String(tag).trim()).filter(Boolean)
      : String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const seen = new Set();
    return tags.filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getLatestByDate(items, dateFields = ["updatedAt", "date"]) {
    return items
      .slice()
      .sort((a, b) => {
        const left = dateFields.map((field) => a[field]).find(Boolean) || "";
        const right = dateFields.map((field) => b[field]).find(Boolean) || "";
        return String(right).localeCompare(String(left));
      })[0] || null;
  }

  function getResearchUpdatedAt(stock, journalEntries = []) {
    const latestJournal = getLatestByDate(journalEntries, ["updatedAt", "date"]);
    const latestThesis = getLatestByDate(stock.thesisHistory || [], ["savedAt"]);
    return [latestJournal?.updatedAt, latestJournal?.date, latestThesis?.savedAt, stock.lastReviewedAt, stock.lastUpdatedDate]
      .filter(Boolean)
      .sort()
      .reverse()[0] || "";
  }

  function hasResearch(stock) {
    return !isMissingText(stock.businessOverview)
      || !isMissingText(stock.thesisSummary || stock.thesis)
      || !isMissingText(stock.growthDrivers)
      || !isMissingText(stock.competitiveAdvantages)
      || !isMissingText(stock.valuationNotes)
      || !isMissingText(stock.researchNotes);
  }

  function hasPosition(status) {
    return Number(status.position?.shares) > 0;
  }

  function getStockResearchStatus({ state, stock, calculatePosition, currentDate }) {
    const journals = (state.journalEntries || []).filter((entry) => !entry.isDeleted && !entry.isArchived && entry.stockId === stock.id);
    const latestDecision = getLatestByDate(journals, ["date", "updatedAt"]);
    const lastUpdated = getResearchUpdatedAt(stock, journals);
    const outdatedDays = Number(state.settings?.researchOutdatedDays) > 0 ? Number(state.settings.researchOutdatedDays) : DEFAULT_OUTDATED_DAYS;
    const days = daysSince(lastUpdated, currentDate);
    const position = calculatePosition ? calculatePosition(stock.id) : null;
    const reasons = [];
    if (!hasResearch(stock)) reasons.push("Missing Research");
    if (stock.nextReviewDate && stock.nextReviewDate <= currentDate) reasons.push("Next Review Date is due");
    if (OUTDATED_STATUSES.includes(stock.thesisStatus)) reasons.push("Thesis needs review");
    if (days > outdatedDays) reasons.push("Research may be outdated. Please review and update it manually.");
    return {
      stock,
      hasResearch: hasResearch(stock),
      latestDecision,
      latestThesis: stock.thesisSummary || stock.thesis || "",
      confidence: latestDecision?.confidence ?? "",
      lastUpdated,
      nextReviewDate: stock.nextReviewDate || "",
      daysSinceLastUpdate: days,
      isOutdated: days > outdatedDays,
      reviewStatus: reasons,
      position
    };
  }

  function getResearchStatus({ state, stock, calculatePosition, currentDate }) {
    const base = getStockResearchStatus({ state, stock, calculatePosition, currentDate });
    if (!base.hasResearch) return { ...base, status: RESEARCH_STATUS.missing, statusLabel: "Missing Research", severity: 3 };
    if (base.isOutdated) return { ...base, status: RESEARCH_STATUS.outdated, statusLabel: "Outdated", severity: 2 };
    if ((stock.nextReviewDate && stock.nextReviewDate <= currentDate) || OUTDATED_STATUSES.includes(stock.thesisStatus)) {
      return { ...base, status: RESEARCH_STATUS.needsReview, statusLabel: "Needs Review", severity: 1 };
    }
    return { ...base, status: RESEARCH_STATUS.upToDate, statusLabel: "Up to Date", severity: 0 };
  }

  function buildCompanyWorkspace({ state, stockId, calculatePosition }) {
    const stock = (state.watchlistStocks || []).find((item) => item.id === stockId);
    if (!stock) return null;
    const journals = (state.journalEntries || [])
      .filter((entry) => !entry.isDeleted && !entry.isArchived && entry.stockId === stockId)
      .sort((a, b) => String(b.date || b.updatedAt || "").localeCompare(String(a.date || a.updatedAt || "")));
    const transactions = (state.transactions || [])
      .filter((transaction) => !transaction.isDeleted && transaction.stockId === stockId)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const thesisHistory = (stock.thesisHistory || []).map((item, index) => ({ version: item.version || index + 1, ...item }));
    return {
      stock,
      position: calculatePosition ? calculatePosition(stockId) : null,
      journals,
      transactions,
      reviews: journals.filter((entry) => REVIEW_ENTRY_TYPES.includes(entry.entryType)),
      decisions: journals,
      latestDecision: getLatestByDate(journals, ["date", "updatedAt"]),
      latestThesis: thesisHistory[thesisHistory.length - 1] || null,
      thesisHistory,
      status: getResearchStatus({ state, stock, calculatePosition, currentDate: new Date().toISOString().slice(0, 10) }),
      daysSinceLastUpdate: daysSince(getResearchUpdatedAt(stock, journals))
    };
  }

  function normalizeSearchText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getSearchHaystack(stock, latestDecision) {
    return [
      stock.ticker,
      stock.companyName,
      stock.market,
      stock.industry,
      stock.stage,
      stock.businessOverview,
      stock.thesisSummary,
      stock.thesis,
      stock.growthDrivers,
      stock.competitiveAdvantages,
      stock.mainRisks,
      stock.risk,
      stock.catalysts,
      stock.valuationNotes,
      stock.researchNotes,
      Array.isArray(stock.sources) ? stock.sources.join(" ") : stock.sources,
      normalizeTags(stock.tags).join(" "),
      latestDecision?.title,
      latestDecision?.investmentThesis
    ].join(" ").toLowerCase();
  }

  function sortResearchStatuses(statuses, sortBy, direction = "asc") {
    const multiplier = direction === "desc" ? -1 : 1;
    const valueFor = (item) => {
      if (sortBy === "companyName") return normalizeSearchText(item.stock.companyName);
      if (sortBy === "symbol") return normalizeSymbol(item.stock.ticker);
      if (sortBy === "lastUpdated") return item.lastUpdated || "";
      if (sortBy === "nextReviewDate") return item.nextReviewDate || "9999-12-31";
      if (sortBy === "daysSinceLastUpdate") return item.daysSinceLastUpdate === Infinity ? 999999 : item.daysSinceLastUpdate;
      if (sortBy === "confidence") return Number(item.confidence) || -1;
      if (sortBy === "recentlyCreated") return item.stock.createdAt || item.stock.id || "";
      return item.severity ?? 0;
    };
    return statuses.slice().sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (av === bv) return normalizeSymbol(a.stock.ticker).localeCompare(normalizeSymbol(b.stock.ticker));
      return av > bv ? multiplier : -multiplier;
    });
  }

  function applyResearchDashboardQuery(statuses, query = {}) {
    const keyword = normalizeSearchText(query.keyword);
    const statusFilter = query.status || "all";
    const positionFilter = query.position || "all";
    const confidenceMin = query.confidenceMin === "" || query.confidenceMin === undefined ? null : Number(query.confidenceMin);
    const tag = normalizeSearchText(query.tag);
    const nextReviewFrom = normalizeDate(query.nextReviewFrom);
    const nextReviewTo = normalizeDate(query.nextReviewTo);
    const filtered = statuses.filter((item) => {
      if (keyword && !getSearchHaystack(item.stock, item.latestDecision).includes(keyword)) return false;
      if (statusFilter === "hasResearch" && !item.hasResearch) return false;
      if (statusFilter === "missingResearch" && item.hasResearch) return false;
      if (statusFilter === "needsReview" && item.status !== RESEARCH_STATUS.needsReview) return false;
      if (statusFilter === "outdated" && item.status !== RESEARCH_STATUS.outdated) return false;
      if (positionFilter === "hasPosition" && !hasPosition(item)) return false;
      if (positionFilter === "noPosition" && hasPosition(item)) return false;
      if (tag && !normalizeTags(item.stock.tags).some((stockTag) => stockTag.toLowerCase().includes(tag))) return false;
      if (confidenceMin !== null) {
        const confidence = Number(item.confidence);
        if (!Number.isFinite(confidence) || confidence < confidenceMin) return false;
      }
      if (nextReviewFrom && (!item.nextReviewDate || item.nextReviewDate < nextReviewFrom)) return false;
      if (nextReviewTo && (!item.nextReviewDate || item.nextReviewDate > nextReviewTo)) return false;
      return true;
    });
    return sortResearchStatuses(filtered, query.sortBy || "severity", query.sortDirection || "desc");
  }

  function findDuplicateSymbols(stocks = []) {
    const groups = new Map();
    stocks.forEach((stock) => {
      const symbol = normalizeSymbol(stock.ticker || stock.symbol);
      if (!symbol) return;
      if (!groups.has(symbol)) groups.set(symbol, []);
      groups.get(symbol).push(stock);
    });
    return Array.from(groups.entries())
      .filter(([, items]) => items.length > 1)
      .map(([symbol, items]) => ({ symbol, items }));
  }

  function findOrphanReferences(state) {
    const stockIds = new Set((state.watchlistStocks || []).map((stock) => stock.id));
    const transactionIds = new Set((state.transactions || []).map((transaction) => transaction.id));
    const issues = [];
    (state.positions || []).forEach((position) => {
      if (position.stockId && !stockIds.has(position.stockId)) issues.push({ type: "position", id: position.stockId, message: "Position links to a missing company." });
    });
    (state.transactions || []).forEach((transaction) => {
      if (transaction.stockId && !stockIds.has(transaction.stockId)) issues.push({ type: "transaction", id: transaction.id, message: "Transaction links to a missing company." });
    });
    (state.journalEntries || []).forEach((entry) => {
      if (entry.stockId && !stockIds.has(entry.stockId)) issues.push({ type: "journal", id: entry.id, message: "Decision links to a missing company." });
      if (entry.transactionId && !transactionIds.has(entry.transactionId)) issues.push({ type: "journal", id: entry.id, message: "Decision links to a missing transaction." });
    });
    return issues;
  }

  function validateResearchInput(values, existingStocks = [], currentStockId = "") {
    const errors = [];
    const ticker = normalizeSymbol(values.ticker);
    const companyName = String(values.companyName || "").trim();
    const nextReviewDate = normalizeDate(values.nextReviewDate);
    const lastUpdatedDate = normalizeDate(values.lastUpdatedDate);
    if (!ticker) errors.push("Symbol is required.");
    if (!companyName) errors.push("Company name is required.");
    if (String(values.nextReviewDate || "").trim() && !nextReviewDate) errors.push("Next Review Date must use YYYY-MM-DD.");
    if (String(values.lastUpdatedDate || "").trim() && !lastUpdatedDate) errors.push("Last Updated Date must use YYYY-MM-DD.");
    if (existingStocks.some((stock) => stock.id !== currentStockId && normalizeSymbol(stock.ticker) === ticker)) errors.push(`${ticker} already exists in Watchlist.`);
    return { valid: errors.length === 0, errors, ticker, companyName, nextReviewDate, lastUpdatedDate };
  }

  function buildResearchDashboard({ state, calculatePosition, currentDate = new Date().toISOString().slice(0, 10), query = {} }) {
    const statuses = (state.watchlistStocks || []).map((stock) => getResearchStatus({ state, stock, calculatePosition, currentDate }));
    const filteredStatuses = applyResearchDashboardQuery(statuses, query);
    const recentDecisions = (state.journalEntries || [])
      .filter((entry) => !entry.isDeleted && !entry.isArchived)
      .slice()
      .sort((a, b) => String(b.date || b.updatedAt || "").localeCompare(String(a.date || a.updatedAt || "")))
      .slice(0, 8);
    const recentThesisUpdates = (state.watchlistStocks || []).flatMap((stock) => (stock.thesisHistory || []).map((item, index) => ({ stock, version: item.version || index + 1, ...item })))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")))
      .slice(0, 8);
    return {
      statuses,
      filteredStatuses,
      duplicateSymbols: findDuplicateSymbols(state.watchlistStocks || []),
      orphanReferences: findOrphanReferences(state),
      companiesWithoutResearch: statuses.filter((item) => !item.hasResearch),
      upcomingReviews: statuses.filter((item) => item.nextReviewDate && item.nextReviewDate <= currentDate),
      recentlyUpdatedResearch: statuses.filter((item) => item.lastUpdated).sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated))).slice(0, 8),
      outdatedResearch: statuses.filter((item) => item.status !== RESEARCH_STATUS.upToDate),
      recentDecisions,
      recentThesisUpdates
    };
  }

  return {
    DEFAULT_OUTDATED_DAYS,
    LESSON_TAGS,
    RESEARCH_STATUS,
    applyResearchDashboardQuery,
    buildCompanyWorkspace,
    buildResearchDashboard,
    daysSince,
    findDuplicateSymbols,
    findOrphanReferences,
    getResearchStatus,
    getResearchUpdatedAt,
    getStockResearchStatus,
    hasResearch,
    normalizeDate,
    normalizeSymbol,
    normalizeTags,
    validateResearchInput
  };
})();
