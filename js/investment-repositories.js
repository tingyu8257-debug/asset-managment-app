(typeof window !== "undefined" ? window : globalThis).InvestmentRepositories = (() => {
  function create({ state, savePart, now = () => new Date().toISOString() }) {
    function saveMany(keys) {
      keys.forEach((key) => savePart(key));
    }

    function compactArray(key, predicate) {
      if (!Array.isArray(state[key])) state[key] = [];
      const before = state[key].length;
      state[key] = state[key].filter(predicate);
      return before !== state[key].length;
    }

    function detachJournalTransactions(removedTransactionIds) {
      let changed = false;
      state.journalEntries.forEach((entry) => {
        if (removedTransactionIds.has(entry.transactionId)) {
          entry.transactionId = "";
          entry.updatedAt = now();
          changed = true;
        }
      });
      return changed;
    }

    function detachReviewTransactions(removedTransactionIds) {
      let changed = false;
      (state.investmentReviews || []).forEach((review) => {
        if (removedTransactionIds.has(review.transactionId)) {
          review.transactionId = "";
          review.updatedAt = now();
          changed = true;
        }
      });
      return changed;
    }

    function removePositionData(stockId) {
      const removedTransactionIds = new Set(
        state.transactions.filter((transaction) => transaction.stockId === stockId).map((transaction) => transaction.id)
      );
      const changedPositions = compactArray("positions", (position) => position.stockId !== stockId);
      const changedTransactions = compactArray("transactions", (transaction) => transaction.stockId !== stockId);
      const changedJournal = detachJournalTransactions(removedTransactionIds);
      const changedReviews = compactArray("investmentReviews", (review) => review.stockId !== stockId && review.companyId !== stockId && !removedTransactionIds.has(review.transactionId));
      const changedLessons = compactArray("investmentLessons", (lesson) => lesson.stockId !== stockId && lesson.companyId !== stockId);
      saveMany([
        ...(changedPositions ? ["positions"] : []),
        ...(changedTransactions ? ["transactions"] : []),
        ...(changedJournal ? ["journalEntries"] : []),
        ...(changedReviews ? ["investmentReviews"] : []),
        ...(changedLessons ? ["investmentLessons"] : [])
      ]);
    }

    const watchlistRepository = {
      deleteStock(stockId) {
        const changedStock = compactArray("watchlistStocks", (stock) => stock.id !== stockId);
        const removedTransactionIds = new Set(
          state.transactions.filter((transaction) => transaction.stockId === stockId).map((transaction) => transaction.id)
        );
        const changedPositions = compactArray("positions", (position) => position.stockId !== stockId);
        const changedTransactions = compactArray("transactions", (transaction) => transaction.stockId !== stockId);
        const changedJournal = compactArray("journalEntries", (entry) => entry.stockId !== stockId && !removedTransactionIds.has(entry.transactionId));
        const changedReviews = compactArray("investmentReviews", (review) => review.stockId !== stockId && review.companyId !== stockId && !removedTransactionIds.has(review.transactionId));
        const changedLessons = compactArray("investmentLessons", (lesson) => lesson.stockId !== stockId && lesson.companyId !== stockId);
        saveMany([
          ...(changedStock ? ["watchlistStocks"] : []),
          ...(changedPositions ? ["positions"] : []),
          ...(changedTransactions ? ["transactions"] : []),
          ...(changedJournal ? ["journalEntries"] : []),
          ...(changedReviews ? ["investmentReviews"] : []),
          ...(changedLessons ? ["investmentLessons"] : [])
        ]);
        return changedStock;
      }
    };

    const positionRepository = {
      deletePosition(stockId) {
        removePositionData(stockId);
      }
    };

    const transactionRepository = {
      deleteTransaction(transactionId) {
        const transaction = state.transactions.find((item) => item.id === transactionId);
        if (!transaction) return false;
        const changedTransactions = compactArray("transactions", (item) => item.id !== transactionId);
        const changedJournal = detachJournalTransactions(new Set([transactionId]));
        const changedReviews = detachReviewTransactions(new Set([transactionId]));
        saveMany([
          ...(changedTransactions ? ["transactions"] : []),
          ...(changedJournal ? ["journalEntries"] : []),
          ...(changedReviews ? ["investmentReviews"] : [])
        ]);
        return true;
      }
    };

    const journalRepository = {
      deleteEntry(entryId) {
        const changedJournal = compactArray("journalEntries", (entry) => entry.id !== entryId);
        state.transactions.forEach((transaction) => {
          if (transaction.journalEntryId === entryId) transaction.journalEntryId = "";
        });
        saveMany(changedJournal ? ["journalEntries", "transactions"] : ["transactions"]);
        return changedJournal;
      }
    };

    function cleanupDeletedRecords() {
      const existingStockIds = new Set(state.watchlistStocks.map((stock) => stock.id));
      const changedPositions = compactArray("positions", (position) => !position.isArchived && existingStockIds.has(position.stockId));
      const changedTransactions = compactArray("transactions", (transaction) => !transaction.isDeleted && existingStockIds.has(transaction.stockId));
      const existingTransactionIds = new Set(state.transactions.map((transaction) => transaction.id));
      const changedJournal = compactArray("journalEntries", (entry) => !entry.isDeleted && (!entry.transactionId || existingTransactionIds.has(entry.transactionId)));
      const existingDecisionIds = new Set(state.journalEntries.map((entry) => entry.id));
      const changedReviews = compactArray("investmentReviews", (review) => !review.isArchived && existingStockIds.has(review.companyId || review.stockId) && (!review.decisionId || existingDecisionIds.has(review.decisionId)) && (!review.transactionId || existingTransactionIds.has(review.transactionId)));
      const existingReviewIds = new Set((state.investmentReviews || []).map((review) => review.id));
      const changedLessons = compactArray("investmentLessons", (lesson) => !lesson.isArchived && (!lesson.companyId || existingStockIds.has(lesson.companyId)) && (lesson.relatedReviews || []).every((reviewId) => existingReviewIds.has(reviewId)));
      saveMany([
        ...(changedPositions ? ["positions"] : []),
        ...(changedTransactions ? ["transactions"] : []),
        ...(changedJournal ? ["journalEntries"] : []),
        ...(changedReviews ? ["investmentReviews"] : []),
        ...(changedLessons ? ["investmentLessons"] : [])
      ]);
    }

    return {
      cleanupDeletedRecords,
      watchlistRepository,
      positionRepository,
      transactionRepository,
      journalRepository
    };
  }

  return { create };
})();
