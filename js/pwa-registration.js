(typeof window !== "undefined" ? window : globalThis).PwaRegistration = (() => {
  let deferredInstallPrompt = null;
  let waitingWorker = null;
  let statusTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, options = {}) {
    const panel = byId("pwa-status");
    const text = byId("pwa-status-text");
    const installButton = byId("pwa-install-button");
    if (!panel || !text || !installButton) return;

    text.textContent = message;
    panel.hidden = !message;
    panel.classList.toggle("pwa-status-warning", Boolean(options.warning));
    installButton.hidden = !options.canInstall;
    installButton.textContent = options.actionLabel || "安裝 App";

    window.clearTimeout(statusTimer);
    if (message && !options.persist) {
      statusTimer = window.setTimeout(() => {
        panel.hidden = true;
      }, options.duration || 4500);
    }
  }

  function updateOnlineStatus() {
    if (!navigator.onLine) {
      setStatus("目前離線：App 會使用已快取的檔案，資料仍保存在這台裝置。", { warning: true, persist: true });
      return;
    }
    setStatus("已恢復連線。", { duration: 3000 });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!["http:", "https:"].includes(window.location.protocol)) {
      setStatus("目前使用檔案模式。若要安裝為 App，請用本機伺服器或部署後開啟。", { warning: true, duration: 6500 });
      return;
    }

    navigator.serviceWorker.register("./service-worker.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker = registration.waiting;
          setStatus("已有新版離線檔案，重新整理後會套用。", { canInstall: true, actionLabel: "重新整理", persist: true });
        }
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorker = worker;
              setStatus("已有新版離線檔案，重新整理後會套用。", { canInstall: true, actionLabel: "重新整理", persist: true });
            }
          });
        });
      })
      .catch(() => {
        setStatus("離線快取啟用失敗；目前仍可使用一般本機資料。", { warning: true, duration: 6500 });
      });
  }

  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      setStatus("可以安裝到桌面或手機主畫面。", { canInstall: true, persist: true });
    });

    byId("pwa-install-button")?.addEventListener("click", async () => {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        waitingWorker = null;
        return;
      }
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      setStatus("安裝流程已完成或取消。", { duration: 3500 });
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      setStatus("App 已安裝。", { duration: 3500 });
    });
  }

  function setupStandaloneMode() {
    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    document.body.classList.toggle("is-standalone", Boolean(isStandalone));
  }

  function init() {
    setupStandaloneMode();
    setupInstallPrompt();
    registerServiceWorker();
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      window.location.reload();
    });
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    if (!navigator.onLine) updateOnlineStatus();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.PwaRegistration?.init();
});
