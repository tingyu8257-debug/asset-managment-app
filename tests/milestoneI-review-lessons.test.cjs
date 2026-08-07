const assert = require("assert");
require("../js/decision-domain.js");
require("../js/review-domain.js");

const reviewDomain = global.ReviewDomain;

const state = {
  watchlistStocks: [
    { id: "stock-nvda", ticker: "NVDA", companyName: "Nvidia", tags: ["AI"] }
  ],
  positions: [{ stockId: "stock-nvda", currentPrice: 100, isArchived: false }],
  transactions: [
    { id: "tx-1", stockId: "stock-nvda", ticker: "NVDA", date: "2026-01-10", type: "buy", shares: 1, price: 100, isDeleted: false }
  ],
  journalEntries: [
    {
      id: "decision-1",
      stockId: "stock-nvda",
      companyId: "stock-nvda",
      ticker: "NVDA",
      date: "2026-01-10",
      entryType: "buy",
      decisionType: "buy",
      title: "Buy NVDA",
      investmentThesis: "AI growth",
      expectedOutcome: "Revenue grows",
      risks: "Valuation",
      confidence: 7,
      transactionId: "tx-1",
      nextReviewDate: "2026-02-10",
      executionStatus: "executed"
    }
  ],
  investmentReviews: [],
  investmentLessons: []
};

const saved = [];
const repo = reviewDomain.createRepository(state, (name) => saved.push(name));

assert(reviewDomain.REVIEW_TYPES.includes("buyReview"));
assert(reviewDomain.LESSON_CATEGORIES.includes("Risk Management"));
assert(reviewDomain.MISTAKE_LIBRARY.includes("No Exit Plan"));
assert(reviewDomain.SUCCESS_LIBRARY.includes("Patient Holding"));

assert.strictEqual(reviewDomain.validateReview({ reviewDate: "", decisionId: "", companyId: "" }).valid, false);
assert.strictEqual(reviewDomain.validateLesson({ title: "", description: "" }).valid, false);

const review = repo.upsertReview({
  companyId: "stock-nvda",
  decisionId: "decision-1",
  transactionId: "tx-1",
  reviewDate: "2026-02-15",
  reviewType: "buyReview",
  outcome: "good",
  whatWentWell: "Thesis improved",
  whatWentWrong: "",
  lessonsLearned: "Good position size",
  nextImprovement: "Review valuation earlier",
  tags: "Position Sizing",
  reminderDate: reviewDomain.addDays("2026-02-15", 90)
});

assert.strictEqual(state.investmentReviews.length, 1);
assert.strictEqual(review.ticker, "NVDA");
assert.strictEqual(review.reminderDate, "2026-05-16");
assert(saved.includes("investmentReviews"));

const lesson = repo.upsertLesson({
  companyId: "stock-nvda",
  relatedReviews: [review.id],
  kind: "success",
  title: "Good Position Size",
  description: "Sizing kept risk comfortable.",
  category: "Position Sizing",
  importance: "high",
  tags: "Success"
});

assert.strictEqual(state.investmentLessons.length, 1);
assert.strictEqual(lesson.relatedReviews[0], review.id);
assert(saved.includes("investmentLessons"));

const filteredReviews = reviewDomain.filterReviews(state.investmentReviews, state, { keyword: "position" });
assert.strictEqual(filteredReviews.length, 1);
const filteredLessons = reviewDomain.filterLessons(state.investmentLessons, state, { kind: "success", category: "Position Sizing" });
assert.strictEqual(filteredLessons.length, 1);

const dashboard = reviewDomain.buildDashboard(state, "2026-05-20");
assert.strictEqual(dashboard.dueReviewReminders.length, 1);
assert.strictEqual(dashboard.recentReviews.length, 1);
assert.strictEqual(dashboard.recentLessons.length, 1);
assert.strictEqual(dashboard.mostCommonSuccesses[0].label, "Good Position Size");

repo.archiveReview(review.id);
assert.strictEqual(reviewDomain.filterReviews(state.investmentReviews, state, {}).length, 0);
repo.restoreReview(review.id);
assert.strictEqual(reviewDomain.filterReviews(state.investmentReviews, state, {}).length, 1);

const analytics = reviewDomain.calculateAnalytics(state);
assert.strictEqual(analytics.reviewCount, 1);
assert.strictEqual(analytics.successCount, 1);

const normalizedLegacy = reviewDomain.normalizeReview({ id: "legacy-review", stockId: "stock-nvda", decisionId: "decision-1", date: "bad-date", lessonsLearned: ["A", "B"] }, state);
assert.strictEqual(normalizedLegacy.companyId, "stock-nvda");
assert.strictEqual(normalizedLegacy.reviewType, "customReview");
assert.notStrictEqual(normalizedLegacy.reviewDate, "");

console.log("milestone I review and lessons tests passed");
