(function (root) {
  function create({
    state,
    byId,
    escapeHtml,
    today,
    openDialog,
    closeDialog,
    save,
    requestRenderAll
  }) {
    const domain = root.ReviewDomain;
    const decisionDomain = root.DecisionDomain;
    const repository = domain.createRepository(state, save);

    function unknown(value) {
      const text = String(value ?? "").trim();
      return text || "尚未設定";
    }

    function getStock(stockId) {
      return (state.watchlistStocks || []).find((stock) => stock.id === stockId) || null;
    }

    function getDecision(decisionId) {
      return (state.journalEntries || []).find((entry) => entry.id === decisionId) || null;
    }

    function getReview(reviewId) {
      return (state.investmentReviews || []).find((review) => review.id === reviewId) || null;
    }

    function fillSelect(select, options, selected = "", emptyLabel = "尚未設定") {
      select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}`;
      select.value = selected || "";
    }

    function stockOptions() {
      return (state.watchlistStocks || []).map((stock) => ({ value: stock.id, label: `${stock.ticker} · ${stock.companyName}` }));
    }

    function decisionOptions(companyId = "") {
      return (state.journalEntries || [])
        .map((entry) => decisionDomain ? decisionDomain.normalizeDecision(entry, state) : entry)
        .filter((entry) => !entry.isArchived && (!companyId || entry.stockId === companyId || entry.companyId === companyId))
        .map((entry) => ({ value: entry.id, label: `${entry.decisionDate || entry.date || "尚未設定"} · ${entry.ticker || "未連結"} · ${entry.title || entry.decisionType}` }));
    }

    function transactionOptions(companyId = "") {
      return (state.transactions || [])
        .filter((transaction) => !transaction.isDeleted && (!companyId || transaction.stockId === companyId))
        .map((transaction) => {
          const stock = getStock(transaction.stockId);
          return { value: transaction.id, label: `${transaction.date || "尚未設定"} · ${stock?.ticker || transaction.ticker || "未連結"} · ${transaction.type}` };
        });
    }

    function reviewOptions(companyId = "") {
      return (state.investmentReviews || [])
        .filter((review) => !review.isArchived && (!companyId || review.companyId === companyId))
        .map((review) => {
          const normalized = domain.normalizeReview(review, state);
          return { value: normalized.id, label: `${normalized.reviewDate} · ${normalized.ticker || "未連結"} · ${reviewTypeLabel(normalized.reviewType)}` };
        });
    }

    function reviewTypeLabel(type) {
      return {
        buyReview: "Buy Review",
        sellReview: "Sell Review",
        longTermReview: "Long-term Review",
        progressReview: "Progress Review",
        finalReview: "Final Review",
        customReview: "Custom Review"
      }[type] || type || "Review";
    }

    function outcomeLabel(outcome) {
      return {
        excellent: "Excellent",
        good: "Good",
        neutral: "Neutral",
        poor: "Poor",
        failed: "Failed"
      }[outcome] || outcome || "Neutral";
    }

    function kindLabel(kind) {
      return {
        lesson: "Lesson",
        mistake: "Mistake",
        success: "Success"
      }[kind] || "Lesson";
    }

    function getQuery() {
      return {
        keyword: byId("review-search")?.value || "",
        companyId: byId("review-company-filter")?.value || "",
        outcome: byId("review-outcome-filter")?.value || "",
        reviewType: byId("review-type-filter")?.value || "",
        category: byId("lesson-category-filter")?.value || "",
        kind: byId("lesson-kind-filter")?.value || "",
        tag: byId("review-tag-filter")?.value || "",
        includeArchived: Boolean(byId("review-show-archived")?.checked)
      };
    }

    function render() {
      if (!byId("reviews-content")) return;
      renderFilters();
      const query = getQuery();
      const reviews = domain.filterReviews(state.investmentReviews || [], state, query);
      const lessons = domain.filterLessons(state.investmentLessons || [], state, query);
      const analytics = domain.calculateAnalytics(state);
      byId("review-summary-cards").innerHTML = `
        <article class="stat-card"><p>Reviews</p><strong>${analytics.reviewCount}</strong><span>Decision Review</span></article>
        <article class="stat-card"><p>Lessons</p><strong>${analytics.lessonCount}</strong><span>Reusable Learning</span></article>
        <article class="stat-card attention-card"><p>Mistakes</p><strong>${analytics.mistakeCount}</strong><span>可重複檢討</span></article>
        <article class="stat-card"><p>Successes</p><strong>${analytics.successCount}</strong><span>可複製做法</span></article>`;
      byId("review-list").innerHTML = reviews.length ? reviews.map(renderReviewCard).join("") : `<p class="empty-state">目前沒有符合條件的 Review。</p>`;
      byId("lesson-list").innerHTML = lessons.length ? lessons.map(renderLessonCard).join("") : `<p class="empty-state">目前沒有符合條件的 Lesson。</p>`;
    }

    function renderFilters() {
      fillSelect(byId("review-company-filter"), stockOptions(), byId("review-company-filter").value, "全部公司");
      fillSelect(byId("review-type-filter"), domain.REVIEW_TYPES.map((type) => ({ value: type, label: reviewTypeLabel(type) })), byId("review-type-filter").value, "全部類型");
      fillSelect(byId("review-outcome-filter"), domain.REVIEW_OUTCOMES.map((outcome) => ({ value: outcome, label: outcomeLabel(outcome) })), byId("review-outcome-filter").value, "全部 Outcome");
      fillSelect(byId("lesson-kind-filter"), domain.LESSON_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) })), byId("lesson-kind-filter").value, "全部 Lesson");
      fillSelect(byId("lesson-category-filter"), domain.LESSON_CATEGORIES.map((category) => ({ value: category, label: category })), byId("lesson-category-filter").value, "全部分類");
    }

    function renderReviewCard(review) {
      const decision = getDecision(review.decisionId);
      const template = domain.REVIEW_TEMPLATES[review.reviewType] || domain.REVIEW_TEMPLATES.customReview;
      return `<article class="asset-card ${review.isArchived ? "deleted-record" : ""}">
        <div class="asset-card-header"><div><span class="ticker">${escapeHtml(review.ticker || "未連結")}</span><h3>${escapeHtml(reviewTypeLabel(review.reviewType))}</h3><p>${escapeHtml(review.reviewDate)} · Outcome ${escapeHtml(outcomeLabel(review.outcome))}</p></div><span class="badge ${review.outcome === "failed" || review.outcome === "poor" ? "badge-warning" : "badge-green"}">${escapeHtml(outcomeLabel(review.outcome))}</span></div>
        <p><strong>Decision：</strong>${escapeHtml(decision?.title || "尚未設定")}</p>
        <p><strong>Template：</strong>${escapeHtml(template.prompts.join(" / "))}</p>
        <p><strong>Went Well：</strong>${escapeHtml(unknown(review.whatWentWell))}</p>
        <p><strong>Went Wrong：</strong>${escapeHtml(unknown(review.whatWentWrong))}</p>
        <p><strong>Lessons：</strong>${escapeHtml(unknown(review.lessonsLearned))}</p>
        <p><strong>Next Improvement：</strong>${escapeHtml(unknown(review.nextImprovement))}</p>
        ${review.reminderDate ? `<p class="form-help">Reminder：${escapeHtml(review.reminderDate)}</p>` : ""}
        ${review.tags.length ? `<div class="tag-row">${review.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="record-actions">
          <button class="small-button" type="button" data-edit-review="${review.id}">編輯</button>
          <button class="small-button" type="button" data-create-lesson-from-review="${review.id}">Create Lesson</button>
          ${review.companyId ? `<button class="small-button" type="button" data-open-company-workspace="${review.companyId}">Workspace</button>` : ""}
          ${review.isArchived ? `<button class="small-button" type="button" data-restore-review="${review.id}">還原</button>` : `<button class="small-button danger-button" type="button" data-archive-review="${review.id}">封存</button>`}
        </div>
      </article>`;
    }

    function renderLessonCard(lesson) {
      return `<article class="asset-card ${lesson.isArchived ? "deleted-record" : ""}">
        <div class="asset-card-header"><div><span class="ticker">${escapeHtml(lesson.ticker || lesson.category)}</span><h3>${escapeHtml(lesson.title || "未命名 Lesson")}</h3><p>${escapeHtml(kindLabel(lesson.kind))} · ${escapeHtml(lesson.category)} · ${escapeHtml(lesson.importance)}</p></div><span class="badge ${lesson.kind === "mistake" ? "badge-warning" : "badge-green"}">${escapeHtml(kindLabel(lesson.kind))}</span></div>
        <p>${escapeHtml(unknown(lesson.description))}</p>
        <p class="form-help">Related Reviews：${lesson.relatedReviews.length || 0}</p>
        ${lesson.tags.length ? `<div class="tag-row">${lesson.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="record-actions">
          <button class="small-button" type="button" data-edit-lesson="${lesson.id}">編輯</button>
          ${lesson.companyId ? `<button class="small-button" type="button" data-open-company-workspace="${lesson.companyId}">Workspace</button>` : ""}
          ${lesson.isArchived ? `<button class="small-button" type="button" data-restore-lesson="${lesson.id}">還原</button>` : `<button class="small-button danger-button" type="button" data-archive-lesson="${lesson.id}">封存</button>`}
        </div>
      </article>`;
    }

    function openReviewDialog(reviewId = "", preset = {}) {
      const form = byId("review-form");
      const existing = reviewId ? getReview(reviewId) : null;
      const values = domain.normalizeReview(existing || preset, state);
      form.reset();
      form.elements.reviewId.value = existing?.id || "";
      fillSelect(form.elements.companyId, stockOptions(), values.companyId, "請選擇公司");
      fillSelect(form.elements.decisionId, decisionOptions(values.companyId), values.decisionId, "請選擇 Decision");
      fillSelect(form.elements.transactionId, transactionOptions(values.companyId), values.transactionId, "可選擇交易");
      fillSelect(form.elements.reviewType, domain.REVIEW_TYPES.map((type) => ({ value: type, label: reviewTypeLabel(type) })), values.reviewType);
      fillSelect(form.elements.outcome, domain.REVIEW_OUTCOMES.map((outcome) => ({ value: outcome, label: outcomeLabel(outcome) })), values.outcome);
      form.elements.reviewDate.value = values.reviewDate || today();
      form.elements.whatWentWell.value = values.whatWentWell || "";
      form.elements.whatWentWrong.value = values.whatWentWrong || "";
      form.elements.unexpectedEvents.value = values.unexpectedEvents || "";
      form.elements.lessonsLearned.value = values.lessonsLearned || "";
      form.elements.nextImprovement.value = values.nextImprovement || "";
      form.elements.confidenceReflection.value = values.confidenceReflection || "";
      form.elements.notes.value = values.notes || "";
      form.elements.tags.value = values.tags.join(", ");
      form.elements.reminderPreset.value = "";
      form.elements.reminderDate.value = values.reminderDate || "";
      byId("review-template-help").textContent = templateHelp(values.reviewType);
      form.querySelector(".form-error").textContent = "";
      byId("review-dialog-title").textContent = existing ? "編輯 Decision Review" : "新增 Decision Review";
      openDialog("review-dialog");
    }

    function openLessonDialog(lessonId = "", preset = {}) {
      const form = byId("lesson-form");
      const existing = lessonId ? (state.investmentLessons || []).find((lesson) => lesson.id === lessonId) : null;
      const values = domain.normalizeLesson(existing || preset, state);
      form.reset();
      form.elements.lessonId.value = existing?.id || "";
      fillSelect(form.elements.companyId, stockOptions(), values.companyId, "可選擇公司");
      fillSelect(form.elements.kind, domain.LESSON_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) })), values.kind);
      fillSelect(form.elements.category, domain.LESSON_CATEGORIES.map((category) => ({ value: category, label: category })), values.category);
      fillSelect(form.elements.relatedReviews, reviewOptions(values.companyId), values.relatedReviews[0], "可選擇 Review");
      form.elements.title.value = values.title || "";
      form.elements.description.value = values.description || "";
      form.elements.importance.value = values.importance || "medium";
      form.elements.tags.value = values.tags.join(", ");
      form.elements.isReusable.checked = values.isReusable !== false;
      form.querySelector(".form-error").textContent = "";
      byId("lesson-dialog-title").textContent = existing ? "編輯 Lesson" : "新增 Lesson";
      openDialog("lesson-dialog");
    }

    function templateHelp(type) {
      const template = domain.REVIEW_TEMPLATES[type] || domain.REVIEW_TEMPLATES.customReview;
      return `${template.title} 建議檢查：${template.prompts.join("、")}`;
    }

    function readReviewForm(form) {
      const values = Object.fromEntries(new FormData(form));
      const preset = Number(values.reminderPreset);
      values.reminderDate = values.reminderDate || domain.addDays(values.reviewDate, preset);
      return values;
    }

    function handleReviewSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const error = form.querySelector(".form-error");
      try {
        repository.upsertReview(readReviewForm(form));
        closeDialog("review-dialog");
        requestRenderAll();
      } catch (exception) {
        error.textContent = exception.message || String(exception);
      }
    }

    function handleLessonSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const error = form.querySelector(".form-error");
      const values = Object.fromEntries(new FormData(form));
      values.relatedReviews = values.relatedReviews ? [values.relatedReviews] : [];
      values.isReusable = form.elements.isReusable.checked;
      try {
        repository.upsertLesson(values);
        closeDialog("lesson-dialog");
        requestRenderAll();
      } catch (exception) {
        error.textContent = exception.message || String(exception);
      }
    }

    function handleClick(target) {
      if (target.dataset.openReviewDialog !== undefined) {
        openReviewDialog();
        return true;
      }
      if (target.dataset.openLessonDialog !== undefined) {
        openLessonDialog();
        return true;
      }
      if (target.dataset.createReviewForDecision) {
        const decision = decisionDomain.normalizeDecision(getDecision(target.dataset.createReviewForDecision), state);
        openReviewDialog("", {
          companyId: decision.companyId,
          stockId: decision.stockId,
          decisionId: decision.id,
          transactionId: decision.transactionId,
          reviewType: ["buy", "add"].includes(decision.decisionType) ? "buyReview" : ["sell", "reduce"].includes(decision.decisionType) ? "sellReview" : "progressReview"
        });
        return true;
      }
      if (target.dataset.createReviewForCompany) {
        openReviewDialog("", { companyId: target.dataset.createReviewForCompany, stockId: target.dataset.createReviewForCompany });
        return true;
      }
      if (target.dataset.editReview) {
        openReviewDialog(target.dataset.editReview);
        return true;
      }
      if (target.dataset.archiveReview) {
        if (window.confirm("確定要封存這筆 Review 嗎？")) {
          repository.archiveReview(target.dataset.archiveReview);
          requestRenderAll();
        }
        return true;
      }
      if (target.dataset.restoreReview) {
        repository.restoreReview(target.dataset.restoreReview);
        requestRenderAll();
        return true;
      }
      if (target.dataset.createLessonFromReview) {
        const review = domain.normalizeReview(getReview(target.dataset.createLessonFromReview), state);
        openLessonDialog("", {
          companyId: review.companyId,
          relatedReviews: [review.id],
          title: review.lessonsLearned ? review.lessonsLearned.slice(0, 80) : "",
          description: review.lessonsLearned || review.nextImprovement || "",
          kind: review.outcome === "excellent" || review.outcome === "good" ? "success" : review.outcome === "poor" || review.outcome === "failed" ? "mistake" : "lesson",
          tags: review.tags
        });
        return true;
      }
      if (target.dataset.createLessonForCompany) {
        openLessonDialog("", { companyId: target.dataset.createLessonForCompany });
        return true;
      }
      if (target.dataset.editLesson) {
        openLessonDialog(target.dataset.editLesson);
        return true;
      }
      if (target.dataset.archiveLesson) {
        if (window.confirm("確定要封存這筆 Lesson 嗎？")) {
          repository.archiveLesson(target.dataset.archiveLesson);
          requestRenderAll();
        }
        return true;
      }
      if (target.dataset.restoreLesson) {
        repository.restoreLesson(target.dataset.restoreLesson);
        requestRenderAll();
        return true;
      }
      return false;
    }

    function bindEvents() {
      byId("review-form").addEventListener("submit", handleReviewSubmit);
      byId("lesson-form").addEventListener("submit", handleLessonSubmit);
      ["review-search", "review-company-filter", "review-type-filter", "review-outcome-filter", "lesson-kind-filter", "lesson-category-filter", "review-tag-filter", "review-show-archived"].forEach((id) => {
        byId(id)?.addEventListener(["review-search", "review-tag-filter"].includes(id) ? "input" : "change", render);
      });
      byId("review-form").elements.companyId.addEventListener("change", (event) => {
        const form = event.currentTarget.form;
        fillSelect(form.elements.decisionId, decisionOptions(event.currentTarget.value), "", "請選擇 Decision");
        fillSelect(form.elements.transactionId, transactionOptions(event.currentTarget.value), "", "可選擇交易");
      });
      byId("review-form").elements.decisionId.addEventListener("change", (event) => {
        const decision = decisionDomain.normalizeDecision(getDecision(event.currentTarget.value), state);
        const form = event.currentTarget.form;
        if (decision.companyId) {
          form.elements.companyId.value = decision.companyId;
          fillSelect(form.elements.transactionId, transactionOptions(decision.companyId), decision.transactionId, "可選擇交易");
        }
      });
      byId("review-form").elements.reviewType.addEventListener("change", (event) => {
        byId("review-template-help").textContent = templateHelp(event.currentTarget.value);
      });
      byId("review-form").elements.reminderPreset.addEventListener("change", (event) => {
        const form = event.currentTarget.form;
        form.elements.reminderDate.value = domain.addDays(form.elements.reviewDate.value, Number(event.currentTarget.value));
      });
      byId("lesson-form").elements.companyId.addEventListener("change", (event) => {
        fillSelect(event.currentTarget.form.elements.relatedReviews, reviewOptions(event.currentTarget.value), "", "可選擇 Review");
      });
    }

    return {
      render,
      bindEvents,
      handleClick,
      openReviewDialog,
      openLessonDialog
    };
  }

  root.ReviewView = { create };
})(typeof window !== "undefined" ? window : globalThis);
