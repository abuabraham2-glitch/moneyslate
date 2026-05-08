// Registers the PWA service worker, but only outside Lovable preview iframes.
// SW is intentionally skipped in dev/preview to avoid stale-cache loops.
export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    // Clean up any previously registered SW in preview/iframe contexts.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  import("workbox-window").then(({ Workbox }) => {
    const wb = new Workbox("/sw.js");
    wb.register().catch(() => {
      /* swallow */
    });
  });
}
