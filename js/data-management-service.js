window.DataManagementService = (() => {
  const SCHEMA_VERSION = 5;
  const APP_VERSION = "1.0.0";
  const BACKUP_KIND = "core-satellite-offline-backup";
  const RECOVERY_BACKUP_KEY = "coreSatellite.recoveryBackup";
  const COLLECTIONS = [
    "settings",
    "watchlistStocks",
    "positions",
    "transactions",
    "journalEntries",
    "investmentReviews",
    "investmentLessons",
    "financialAccounts",
    "accountBalances",
    "insurancePolicies",
    "liabilities",
    "incomeCategories",
    "expenseCategories",
    "cashFlowEntries",
    "recurringCashFlows",
    "monthlyBudgets"
  ];
  const METADATA_COLLECTIONS = COLLECTIONS.filter((name) => name !== "settings");

  function create({ state, storage, savePart, today }) {
    let pendingImport = null;

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function now() {
      return new Date().toISOString();
    }

    function text(value) {
      return String(value ?? "").trim();
    }

    function ensureMetadata() {
      let changed = false;
      METADATA_COLLECTIONS.forEach((name) => {
        const rows = Array.isArray(state[name]) ? state[name] : [];
        rows.forEach((row, index) => {
          if (!row || typeof row !== "object") return;
          if (!row.id) {
            row.id = `${name}-${Date.now()}-${index}`;
            changed = true;
          }
          if (!row.createdAt) {
            row.createdAt = row.updatedAt || now();
            changed = true;
          }
          if (!row.updatedAt) {
            row.updatedAt = row.createdAt;
            changed = true;
          }
        });
        if (changed) savePart(name, state[name]);
      });
      return changed;
    }

    function collectionSnapshot(source = state) {
      return COLLECTIONS.reduce((payload, name) => {
        payload[name] = clone(source[name] ?? (name === "settings" ? {} : []));
        return payload;
      }, {});
    }

    function createBackupObject(source = state) {
      return {
        kind: BACKUP_KIND,
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt: now(),
        data: collectionSnapshot(source)
      };
    }

    function createRecoveryBackup(reason = "major-operation") {
      const backup = {
        ...createBackupObject(),
        recoveryReason: reason,
        recoveryCreatedAt: now(),
        localOnly: true
      };
      localStorage.setItem(RECOVERY_BACKUP_KEY, JSON.stringify(backup));
      return backup;
    }

    function hasRecoveryBackup() {
      const raw = localStorage.getItem(RECOVERY_BACKUP_KEY);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.data);
      } catch (error) {
        return false;
      }
    }

    function recoverySummary() {
      const raw = localStorage.getItem(RECOVERY_BACKUP_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed?.data) return null;
        return {
          schemaVersion: Number(parsed.schemaVersion) || 1,
          appVersion: parsed.appVersion || "legacy",
          createdAt: parsed.recoveryCreatedAt || parsed.exportedAt || "",
          reason: parsed.recoveryReason || "major-operation",
          summary: summarizeData(parsed.data)
        };
      } catch (error) {
        return null;
      }
    }

    function exportBackup() {
      ensureMetadata();
      return JSON.stringify(createBackupObject(), null, 2);
    }

    function downloadBackup() {
      const blob = new Blob([exportBackup()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `core-satellite-backup-${today ? today() : new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function parseBackup(rawText) {
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (error) {
        throw new Error("JSON 格式錯誤，無法讀取備份檔。");
      }
      const data = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
      if (!data || typeof data !== "object") throw new Error("備份內容不是有效物件。");
      return {
        kind: parsed.kind || "legacy",
        schemaVersion: Number(parsed.schemaVersion) || 1,
        appVersion: parsed.appVersion || "legacy",
        exportedAt: parsed.exportedAt || "",
        data
      };
    }

    function validateRows(data) {
      const errors = [];
      COLLECTIONS.forEach((name) => {
        if (name === "settings") return;
        if (data[name] !== undefined && !Array.isArray(data[name])) errors.push(`${name} 必須是陣列。`);
        const seen = new Set();
        (Array.isArray(data[name]) ? data[name] : []).forEach((row, index) => {
          if (!row || typeof row !== "object") {
            errors.push(`${name}[${index}] 不是有效資料。`);
            return;
          }
          if (!row.id) errors.push(`${name}[${index}] 缺少 id。`);
          // 使用者要求重複資料先保留，不在 import 時阻擋或自動清理。
          if (row.id) seen.add(row.id);
          ["createdAt", "updatedAt", "date", "balanceDate", "nextDueDate", "nextReviewDate", "lastUpdatedDate"].forEach((key) => {
            if (!row[key]) return;
            const validDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(row[key]));
            const validMonth = /^\d{4}-\d{2}$/.test(String(row[key]));
            const validDateTime = Number.isFinite(new Date(row[key]).getTime());
            if (!validDateOnly && !validMonth && !validDateTime) errors.push(`${name}[${index}] ${key} 日期無效。`);
          });
          Object.entries(row).forEach(([key, value]) => {
            if (typeof value === "number" && (!Number.isFinite(value) || Number.isNaN(value))) errors.push(`${name}[${index}] ${key} 數值無效。`);
            if (value === "NaN" || value === "Infinity" || value === "-Infinity") errors.push(`${name}[${index}] ${key} 不可是 ${value}。`);
          });
        });
      });
      return errors;
    }

    function summarizeData(data) {
      return COLLECTIONS.reduce((summary, name) => {
        summary[name] = name === "settings" ? (data[name] ? 1 : 0) : (Array.isArray(data[name]) ? data[name].length : 0);
        return summary;
      }, {});
    }

    function prepareImport(rawText) {
      const backup = parseBackup(rawText);
      const errors = validateRows(backup.data);
      if (errors.length) throw new Error(errors.slice(0, 8).join("\n"));
      pendingImport = backup;
      return {
        kind: backup.kind,
        schemaVersion: backup.schemaVersion,
        appVersion: backup.appVersion,
        exportedAt: backup.exportedAt,
        summary: summarizeData(backup.data)
      };
    }

    function validateCurrent() {
      return validateRows(collectionSnapshot());
    }

    function mergeRows(currentRows = [], importedRows = []) {
      const byId = new Map(currentRows.map((row) => [row.id, row]));
      importedRows.forEach((row) => {
        if (!row?.id) return;
        byId.set(row.id, { ...(byId.get(row.id) || {}), ...row });
      });
      return Array.from(byId.values());
    }

    function normalizeImportedState(importedData, mode) {
      const current = collectionSnapshot();
      const next = clone(current);
      COLLECTIONS.forEach((name) => {
        if (!Object.prototype.hasOwnProperty.call(importedData, name)) return;
        if (name === "settings") {
          next.settings = mode === "merge" ? { ...next.settings, ...importedData.settings } : importedData.settings;
          return;
        }
        const importedRows = Array.isArray(importedData[name]) ? importedData[name] : [];
        next[name] = mode === "merge" ? mergeRows(next[name], importedRows) : importedRows;
      });
      const restored = storage.restore(next);
      return restored;
    }

    function applyImport(mode) {
      if (!pendingImport) throw new Error("尚未選擇可匯入的備份檔。");
      if (!["merge", "replace"].includes(mode)) throw new Error("Import 模式必須是 Merge 或 Replace。");
      createRecoveryBackup(`import-${mode}`);
      const restored = normalizeImportedState(pendingImport.data, mode);
      COLLECTIONS.forEach((name) => {
        state[name] = restored[name];
      });
      pendingImport = null;
      ensureMetadata();
      return { mode, recoveryBackupCreated: true };
    }

    function restorePreviousState() {
      const raw = localStorage.getItem(RECOVERY_BACKUP_KEY);
      if (!raw) throw new Error("目前沒有可回復的版本。");
      const backup = parseBackup(raw);
      const errors = validateRows(backup.data);
      if (errors.length) throw new Error(errors.slice(0, 8).join("\n"));
      createRecoveryBackup("restore-previous-state");
      const restored = storage.restore(backup.data);
      COLLECTIONS.forEach((name) => {
        state[name] = restored[name];
      });
      ensureMetadata();
      return recoverySummary();
    }

    function searchableRows() {
      const stocks = state.watchlistStocks || [];
      const stockName = (stockId) => {
        const stock = stocks.find((item) => item.id === stockId);
        return stock ? `${stock.ticker} ${stock.companyName}` : "";
      };
      return [
        ...stocks.map((stock) => ({
          type: "Watchlist",
          title: `${stock.ticker} ${stock.companyName}`,
          detail: [stock.market, stock.industry, stock.thesis, stock.risk, (stock.tags || []).join(" ")].join(" "),
          route: "watchlist",
          updatedAt: stock.updatedAt || stock.lastUpdatedDate || stock.createdAt || ""
        })),
        ...(state.positions || []).map((position) => ({
          type: "Position",
          title: stockName(position.stockId) || position.stockId,
          detail: [position.currentPrice, position.currency].join(" "),
          route: "positions",
          updatedAt: position.updatedAt || position.createdAt || ""
        })),
        ...(state.journalEntries || []).map((entry) => ({
          type: "Journal",
          title: entry.title || entry.ticker || "Journal",
          detail: [entry.ticker, entry.investmentThesis, entry.expectedOutcome, entry.risks, entry.note, (entry.tags || []).join(" ")].join(" "),
          route: "journal",
          updatedAt: entry.updatedAt || entry.createdAt || entry.date || ""
        })),
        ...(state.investmentReviews || []).map((review) => ({
          type: "Review",
          title: `${review.ticker || "Review"} ${review.reviewType || ""}`,
          detail: [review.companyName, review.outcome, review.whatWentWell, review.whatWentWrong, review.lessonsLearned, review.notes, (review.tags || []).join(" ")].join(" "),
          route: "reviews",
          updatedAt: review.updatedAt || review.createdAt || review.reviewDate || ""
        })),
        ...(state.investmentLessons || []).map((lesson) => ({
          type: lesson.kind === "mistake" ? "Mistake" : lesson.kind === "success" ? "Success" : "Lesson",
          title: lesson.title || "Lesson",
          detail: [lesson.ticker, lesson.companyName, lesson.category, lesson.description, (lesson.tags || []).join(" ")].join(" "),
          route: "reviews",
          updatedAt: lesson.updatedAt || lesson.createdAt || ""
        })),
        ...(state.financialAccounts || []).map((account) => ({
          type: "Account",
          title: account.name,
          detail: [account.institution, account.type, account.purpose, account.note].join(" "),
          route: "assets",
          updatedAt: account.updatedAt || account.createdAt || ""
        })),
        ...(state.insurancePolicies || []).map((policy) => ({
          type: "Insurance",
          title: policy.name,
          detail: [policy.insurer, policy.category, policy.note].join(" "),
          route: "assets",
          updatedAt: policy.updatedAt || policy.createdAt || policy.cashValueDate || ""
        })),
        ...(state.liabilities || []).map((liability) => ({
          type: "Liability",
          title: liability.name,
          detail: [liability.lender, liability.type, liability.note].join(" "),
          route: "assets",
          updatedAt: liability.updatedAt || liability.createdAt || ""
        })),
        ...(state.cashFlowEntries || []).map((entry) => ({
          type: entry.type === "income" ? "Income" : entry.type === "expense" ? "Expense" : "Transfer",
          title: entry.title || entry.note || entry.type,
          detail: [entry.date, entry.amount, entry.note, (entry.tags || []).join(" ")].join(" "),
          route: "cash-flow",
          updatedAt: entry.updatedAt || entry.createdAt || entry.date || ""
        })),
        ...[...(state.incomeCategories || []), ...(state.expenseCategories || [])].map((category) => ({
          type: "Category",
          title: category.name,
          detail: category.type,
          route: "cash-flow",
          updatedAt: category.updatedAt || category.createdAt || ""
        }))
      ];
    }

    function search(keyword) {
      const query = text(keyword).toLowerCase();
      if (!query) return [];
      return searchableRows()
        .filter((row) => [row.type, row.title, row.detail].join(" ").toLowerCase().includes(query))
        .slice(0, 30);
    }

    function recentActivity(limit = 12) {
      return searchableRows()
        .map((row) => ({ ...row, updatedAt: row.updatedAt || "" }))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, limit);
    }

    return {
      SCHEMA_VERSION,
      APP_VERSION,
      ensureMetadata,
      exportBackup,
      downloadBackup,
      prepareImport,
      applyImport,
      createRecoveryBackup,
      hasRecoveryBackup,
      recoverySummary,
      restorePreviousState,
      validateCurrent,
      search,
      recentActivity
    };
  }

  return { create, SCHEMA_VERSION, APP_VERSION, BACKUP_KIND, RECOVERY_BACKUP_KEY };
})();
