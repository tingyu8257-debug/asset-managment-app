(function (root) {
  const REVIEW_TYPES = ["buyReview", "sellReview", "longTermReview", "progressReview", "finalReview", "customReview"];
  const REVIEW_OUTCOMES = ["excellent", "good", "neutral", "poor", "failed"];
  const LESSON_CATEGORIES = ["Psychology", "Risk Management", "Position Sizing", "Valuation", "Timing", "Research", "Execution", "Portfolio Management", "General"];
  const LESSON_KINDS = ["lesson", "mistake", "success"];
  const REVIEW_REMINDER_DAYS = [30, 90, 180, 365];

  const REVIEW_TEMPLATES = {
    buyReview: {
      title: "Buy Review",
      prompts: ["Thesis Correct?", "Entry Timing", "Risk Assessment", "Position Size"]
    },
    sellReview: {
      title: "Sell Review",
      prompts: ["Exit Timing", "Profit Taking", "Thesis Broken?", "Better Alternative?"]
    },
    longTermReview: {
      title: "Long-term Review",
      prompts: ["Original Thesis", "Current Thesis", "Biggest Change", "Lessons"]
    },
    progressReview: {
      title: "Progress Review",
      prompts: ["What changed?", "What still needs proof?", "Next checkpoint"]
    },
    finalReview: {
      title: "Final Review",
      prompts: ["Final outcome", "Main lesson", "What to repeat or avoid"]
    },
    customReview: {
      title: "Custom Review",
      prompts: ["Review focus", "Evidence", "Next improvement"]
    }
  };

  const MISTAKE_LIBRARY = [
    "Bought Too Early",
    "Sold Too Early",
    "Ignored Risk",
    "Chased Momentum",
    "No Exit Plan",
    "Position Too Large"
  ];

  const SUCCESS_LIBRARY = [
    "Thesis Played Out",
    "Good Position Size",
    "Patient Holding",
    "Proper Risk Control",
    "Bought During Panic"
  ];

  function splitTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    return String(value || "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function normalizeReviewType(value) {
    const type = String(value || "").trim();
    return REVIEW_TYPES.includes(type) ? type : "customReview";
  }

  function normalizeOutcome(value) {
    const outcome = String(value || "").trim();
    return REVIEW_OUTCOMES.includes(outcome) ? outcome : "neutral";
  }

  function normalizeLessonCategory(value) {
    const category = String(value || "").trim();
    return LESSON_CATEGORIES.includes(category) ? category : "General";
  }

  function normalizeLessonKind(value) {
    const kind = String(value || "").trim();
    return LESSON_KINDS.includes(kind) ? kind : "lesson";
  }

  function addDays(dateText, days) {
    const base = normalizeDate(dateText);
    const number = Number(days);
    if (!base || !REVIEW_REMINDER_DAYS.includes(number)) return "";
    const date = new Date(`${base}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + number);
    return date.toISOString().slice(0, 10);
  }

  function getStock(state, companyId) {
    return (state.watchlistStocks || []).find((stock) => stock.id === companyId) || null;
  }

  function getDecision(state, decisionId) {
    return (state.journalEntries || []).find((entry) => entry.id === decisionId) || null;
  }

  function getTransaction(state, transactionId) {
    return (state.transactions || []).find((entry) => entry.id === transactionId) || null;
  }

  function normalizeReview(review = {}, state = {}) {
    const decision = getDecision(state, review.decisionId);
    const transaction = getTransaction(state, review.transactionId || decision?.transactionId);
    const companyId = review.companyId || review.stockId || decision?.stockId || transaction?.stockId || "";
    const stock = getStock(state, companyId);
    const now = new Date().toISOString();
    const reviewDate = normalizeDate(review.reviewDate || review.date) || now.slice(0, 10);
    return {
      id: review.id || `review-${Date.now()}`,
      companyId,
      stockId: companyId,
      ticker: review.ticker || stock?.ticker || decision?.ticker || "",
      companyName: review.companyName || stock?.companyName || decision?.companyName || "",
      decisionId: review.decisionId || "",
      transactionId: review.transactionId || decision?.transactionId || "",
      positionId: review.positionId || companyId,
      reviewDate,
      date: reviewDate,
      reviewType: normalizeReviewType(review.reviewType),
      outcome: normalizeOutcome(review.outcome),
      whatWentWell: review.whatWentWell || "",
      whatWentWrong: review.whatWentWrong || "",
      unexpectedEvents: review.unexpectedEvents || "",
      lessonsLearned: review.lessonsLearned || "",
      nextImprovement: review.nextImprovement || "",
      confidenceReflection: review.confidenceReflection || "",
      notes: review.notes || review.note || "",
      note: review.note || review.notes || "",
      tags: splitTags(review.tags),
      reminderDate: normalizeDate(review.reminderDate || review.nextReviewDate),
      isArchived: Boolean(review.isArchived),
      archivedAt: review.archivedAt || "",
      createdAt: review.createdAt || now,
      updatedAt: review.updatedAt || review.createdAt || now
    };
  }

  function normalizeLesson(lesson = {}, state = {}) {
    const reviewIds = Array.isArray(lesson.relatedReviews)
      ? lesson.relatedReviews
      : splitTags(lesson.relatedReviews);
    const sourceReview = reviewIds[0] ? (state.investmentReviews || []).find((review) => review.id === reviewIds[0]) : null;
    const stock = getStock(state, lesson.companyId || lesson.stockId || sourceReview?.companyId);
    const now = new Date().toISOString();
    return {
      id: lesson.id || `lesson-${Date.now()}`,
      companyId: lesson.companyId || lesson.stockId || sourceReview?.companyId || "",
      stockId: lesson.companyId || lesson.stockId || sourceReview?.companyId || "",
      ticker: lesson.ticker || stock?.ticker || "",
      companyName: lesson.companyName || stock?.companyName || "",
      kind: normalizeLessonKind(lesson.kind || lesson.lessonKind),
      title: lesson.title || "",
      description: lesson.description || lesson.notes || "",
      category: normalizeLessonCategory(lesson.category),
      importance: String(lesson.importance || "medium"),
      tags: splitTags(lesson.tags),
      relatedReviews: reviewIds,
      isReusable: lesson.isReusable !== false,
      isArchived: Boolean(lesson.isArchived),
      archivedAt: lesson.archivedAt || "",
      createdAt: lesson.createdAt || now,
      updatedAt: lesson.updatedAt || lesson.createdAt || now
    };
  }

  function validateReview(input = {}) {
    const errors = [];
    if (!normalizeDate(input.reviewDate || input.date)) errors.push("Review Date 為必填，格式需為 YYYY-MM-DD。");
    if (!String(input.decisionId || "").trim()) errors.push("Review 必須連結一筆 Decision。");
    if (!String(input.companyId || input.stockId || "").trim()) errors.push("Review 必須連結一家公司。");
    if (!REVIEW_TYPES.includes(normalizeReviewType(input.reviewType))) errors.push("Review Type 不正確。");
    if (!REVIEW_OUTCOMES.includes(normalizeOutcome(input.outcome))) errors.push("Outcome 不正確。");
    if (!String(input.lessonsLearned || input.nextImprovement || input.notes || "").trim()) errors.push("請至少填寫 Lessons Learned、Next Improvement 或 Notes。");
    return { valid: errors.length === 0, errors };
  }

  function validateLesson(input = {}) {
    const errors = [];
    if (!String(input.title || "").trim()) errors.push("Lesson Title 為必填。");
    if (!String(input.description || "").trim()) errors.push("Description 為必填。");
    if (!LESSON_CATEGORIES.includes(normalizeLessonCategory(input.category))) errors.push("Lesson Category 不正確。");
    if (!LESSON_KINDS.includes(normalizeLessonKind(input.kind || input.lessonKind))) errors.push("Lesson Type 不正確。");
    return { valid: errors.length === 0, errors };
  }

  function createRepository(state, savePart) {
    function upsertReview(values) {
      const validation = validateReview(values);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      const existing = values.reviewId || values.id
        ? state.investmentReviews.find((item) => item.id === (values.reviewId || values.id))
        : null;
      const normalized = normalizeReview({ ...values, id: existing?.id || values.id || `review-${Date.now()}` }, state);
      normalized.createdAt = existing?.createdAt || normalized.createdAt;
      normalized.updatedAt = new Date().toISOString();
      if (existing) Object.assign(existing, normalized);
      else state.investmentReviews.push(normalized);
      savePart("investmentReviews", state.investmentReviews);
      return normalized;
    }

    function archiveReview(reviewId) {
      const review = state.investmentReviews.find((item) => item.id === reviewId);
      if (!review) return null;
      review.isArchived = true;
      review.archivedAt = new Date().toISOString();
      review.updatedAt = review.archivedAt;
      savePart("investmentReviews", state.investmentReviews);
      return review;
    }

    function restoreReview(reviewId) {
      const review = state.investmentReviews.find((item) => item.id === reviewId);
      if (!review) return null;
      review.isArchived = false;
      review.archivedAt = "";
      review.updatedAt = new Date().toISOString();
      savePart("investmentReviews", state.investmentReviews);
      return review;
    }

    function upsertLesson(values) {
      const validation = validateLesson(values);
      if (!validation.valid) throw new Error(validation.errors.join(" "));
      const existing = values.lessonId || values.id
        ? state.investmentLessons.find((item) => item.id === (values.lessonId || values.id))
        : null;
      const normalized = normalizeLesson({ ...values, id: existing?.id || values.id || `lesson-${Date.now()}` }, state);
      normalized.createdAt = existing?.createdAt || normalized.createdAt;
      normalized.updatedAt = new Date().toISOString();
      if (existing) Object.assign(existing, normalized);
      else state.investmentLessons.push(normalized);
      savePart("investmentLessons", state.investmentLessons);
      return normalized;
    }

    function archiveLesson(lessonId) {
      const lesson = state.investmentLessons.find((item) => item.id === lessonId);
      if (!lesson) return null;
      lesson.isArchived = true;
      lesson.archivedAt = new Date().toISOString();
      lesson.updatedAt = lesson.archivedAt;
      savePart("investmentLessons", state.investmentLessons);
      return lesson;
    }

    function restoreLesson(lessonId) {
      const lesson = state.investmentLessons.find((item) => item.id === lessonId);
      if (!lesson) return null;
      lesson.isArchived = false;
      lesson.archivedAt = "";
      lesson.updatedAt = new Date().toISOString();
      savePart("investmentLessons", state.investmentLessons);
      return lesson;
    }

    return { upsertReview, archiveReview, restoreReview, upsertLesson, archiveLesson, restoreLesson };
  }

  function filterReviews(reviews = [], state = {}, query = {}) {
    const keyword = String(query.keyword || "").trim().toLowerCase();
    const tag = String(query.tag || "").trim().toLowerCase();
    return reviews
      .map((review) => normalizeReview(review, state))
      .filter((review) => query.includeArchived || !review.isArchived)
      .filter((review) => !query.companyId || review.companyId === query.companyId)
      .filter((review) => !query.outcome || review.outcome === query.outcome)
      .filter((review) => !query.reviewType || review.reviewType === query.reviewType)
      .filter((review) => !query.dateFrom || review.reviewDate >= query.dateFrom)
      .filter((review) => !query.dateTo || review.reviewDate <= query.dateTo)
      .filter((review) => !tag || review.tags.some((item) => item.toLowerCase().includes(tag)))
      .filter((review) => {
        if (!keyword) return true;
        const decision = getDecision(state, review.decisionId);
        return [review.ticker, review.companyName, review.outcome, review.whatWentWell, review.whatWentWrong, review.lessonsLearned, review.nextImprovement, review.notes, decision?.title, review.tags.join(" ")]
          .join(" ").toLowerCase().includes(keyword);
      })
      .sort((a, b) => String(b.reviewDate || b.updatedAt || "").localeCompare(String(a.reviewDate || a.updatedAt || "")));
  }

  function filterLessons(lessons = [], state = {}, query = {}) {
    const keyword = String(query.keyword || "").trim().toLowerCase();
    const tag = String(query.tag || "").trim().toLowerCase();
    return lessons
      .map((lesson) => normalizeLesson(lesson, state))
      .filter((lesson) => query.includeArchived || !lesson.isArchived)
      .filter((lesson) => !query.companyId || lesson.companyId === query.companyId)
      .filter((lesson) => !query.kind || lesson.kind === query.kind)
      .filter((lesson) => !query.category || lesson.category === query.category)
      .filter((lesson) => !tag || lesson.tags.some((item) => item.toLowerCase().includes(tag)))
      .filter((lesson) => {
        if (!keyword) return true;
        return [lesson.ticker, lesson.companyName, lesson.kind, lesson.title, lesson.description, lesson.category, lesson.tags.join(" ")]
          .join(" ").toLowerCase().includes(keyword);
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  }

  function buildDashboard(state = {}, currentDate = new Date().toISOString().slice(0, 10)) {
    const reviews = filterReviews(state.investmentReviews || [], state, {});
    const lessons = filterLessons(state.investmentLessons || [], state, {});
    const reviewedDecisionIds = new Set(reviews.filter((review) => ["finalReview", "sellReview"].includes(review.reviewType)).map((review) => review.decisionId));
    const pendingDecisions = (state.journalEntries || [])
      .map((entry) => root.DecisionDomain ? root.DecisionDomain.normalizeDecision(entry, state) : entry)
      .filter((entry) => !entry.isArchived && !reviewedDecisionIds.has(entry.id))
      .filter((entry) => ["buy", "add", "reduce", "sell", "hold"].includes(entry.decisionType || entry.entryType))
      .filter((entry) => !entry.nextReviewDate || entry.nextReviewDate <= currentDate)
      .slice(0, 10);
    const dueReviewReminders = reviews.filter((review) => review.reminderDate && review.reminderDate <= currentDate).slice(0, 10);
    const companiesWaitingForReview = pendingDecisions
      .map((entry) => getStock(state, entry.stockId || entry.companyId))
      .filter(Boolean);
    return {
      pendingReviews: pendingDecisions,
      dueReviewReminders,
      recentReviews: reviews.slice(0, 10),
      recentLessons: lessons.slice(0, 10),
      mostCommonMistakes: countBy(lessons.filter((lesson) => lesson.kind === "mistake"), "title").slice(0, 6),
      mostCommonSuccesses: countBy(lessons.filter((lesson) => lesson.kind === "success"), "title").slice(0, 6),
      companiesWaitingForReview
    };
  }

  function countBy(items, key) {
    const counts = new Map();
    items.forEach((item) => {
      const value = item[key] || "尚未設定";
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  function calculateAnalytics(state = {}) {
    const reviews = filterReviews(state.investmentReviews || [], state, {});
    const lessons = filterLessons(state.investmentLessons || [], state, {});
    return {
      reviewCount: reviews.length,
      lessonCount: lessons.filter((lesson) => lesson.kind === "lesson").length,
      mistakeCount: lessons.filter((lesson) => lesson.kind === "mistake").length,
      successCount: lessons.filter((lesson) => lesson.kind === "success").length,
      reviewsByCompany: countBy(reviews, "ticker"),
      lessonsByCategory: countBy(lessons, "category"),
      lessonsByTag: countBy(lessons.flatMap((lesson) => lesson.tags.map((tag) => ({ tag }))), "tag")
    };
  }

  root.ReviewDomain = {
    REVIEW_TYPES,
    REVIEW_OUTCOMES,
    LESSON_CATEGORIES,
    LESSON_KINDS,
    REVIEW_TEMPLATES,
    REVIEW_REMINDER_DAYS,
    MISTAKE_LIBRARY,
    SUCCESS_LIBRARY,
    splitTags,
    addDays,
    normalizeReview,
    normalizeLesson,
    validateReview,
    validateLesson,
    createRepository,
    filterReviews,
    filterLessons,
    buildDashboard,
    calculateAnalytics
  };
})(typeof window !== "undefined" ? window : globalThis);
