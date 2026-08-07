(function (root) {
  const reviewStatuses = ["needsReview", "weakening", "invalidated"];

  function daysBetween(start, end) {
    if (!start) return Infinity;
    return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  }

  function getReviewReasons(stock, latestJournal, currentDate) {
    const reasons = [];
    const lastUpdate = [stock.lastReviewedAt, latestJournal?.updatedAt, stock.lastUpdatedDate].filter(Boolean).sort().reverse()[0] || "";
    const outdatedDays = Number(stock.researchOutdatedDays) > 0 ? Number(stock.researchOutdatedDays) : 90;
    if (stock.nextReviewDate && stock.nextReviewDate <= currentDate) reasons.push("需要重新檢查：nextReviewDate 已到期");
    if (reviewStatuses.includes(stock.thesisStatus)) reasons.push("需要重新檢查：Thesis 狀態");
    if (daysBetween(lastUpdate, currentDate) > outdatedDays) reasons.push("研究紀錄可能已過期");
    if (!stock.thesisSummary || stock.thesisSummary === "尚未設定") reasons.push("投資理由可能需要更新");
    if (!stock.invalidationConditions || stock.invalidationConditions === "尚未設定") reasons.push("尚未填寫反證條件");
    return reasons;
  }

  function applyThesisReview(stock, values, savedAt) {
    const { changeReason, ...currentValues } = values;
    if (!Array.isArray(stock.thesisHistory)) stock.thesisHistory = [];
    const versionNumber = stock.thesisHistory.length + 1;
    const previousVersion = stock.thesisHistory[stock.thesisHistory.length - 1];
    stock.thesisHistory.push({
      id: `thesis-${stock.id || stock.ticker || "stock"}-${versionNumber}-${Date.now()}`,
      companyId: stock.id || "",
      version: versionNumber,
      versionNumber,
      savedAt,
      createdAt: savedAt,
      content: values.thesisSummary,
      thesisSummary: stock.thesisSummary,
      catalysts: stock.catalysts,
      mainRisks: stock.mainRisks,
      invalidationConditions: stock.invalidationConditions,
      thesisStatus: stock.thesisStatus,
      changeSummary: values.changeSummary || changeReason,
      changeReason,
      previousVersionId: previousVersion?.id || "",
      createdByDecisionId: values.createdByDecisionId || "",
      previousContent: {
        thesisSummary: stock.thesisSummary,
        catalysts: stock.catalysts,
        mainRisks: stock.mainRisks,
        invalidationConditions: stock.invalidationConditions,
        thesisStatus: stock.thesisStatus
      },
      currentContent: {
        thesisSummary: values.thesisSummary,
        catalysts: values.catalysts,
        mainRisks: values.mainRisks,
        invalidationConditions: values.invalidationConditions,
        thesisStatus: values.thesisStatus
      },
      reviewDetails: {
        stillValid: values.stillValid || "",
        newInformation: values.newInformation || ""
      }
    });
    Object.assign(stock, currentValues, {
      thesis: values.thesisSummary,
      risk: values.mainRisks,
      invalidation: values.invalidationConditions,
      lastReviewedAt: savedAt.slice(0, 10),
      lastUpdatedDate: savedAt.slice(0, 10)
    });
    return stock;
  }

  root.ResearchDomain = { getReviewReasons, applyThesisReview };
})(typeof window !== "undefined" ? window : globalThis);
