import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enforce canonical domain (non-www) to ensure localStorage/session persistence
if (window.location.hostname === "www.druto.me" || window.location.hostname === "www.druto.me") {
  const targetHost = window.location.hostname.includes("druto.me") ? "druto.me" : "druto.me";
  window.location.replace(`https://${targetHost}${window.location.pathname}${window.location.search}`);
}

// Prevent intermittent blank screens caused by stale cached JS chunks after deploy.
// If a dynamic import fails, do a one-time hard reload to fetch the latest assets.
const shouldForceReloadForChunkError = (err: unknown) => {
  const message = String((err as any)?.message ?? err ?? "");
  return (
    message.includes("Loading chunk") ||
    message.includes("ChunkLoadError") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
};

const forceReloadOnce = () => {
  const key = "druto_forced_reload_v1";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
};

window.addEventListener("error", (event) => {
  if (shouldForceReloadForChunkError((event as any)?.error ?? (event as any)?.message)) {
    forceReloadOnce();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (shouldForceReloadForChunkError((event as PromiseRejectionEvent).reason)) {
    forceReloadOnce();
  }
});

// Vite emits this event when preloaded chunks fail.
window.addEventListener("vite:preloadError", () => {
  forceReloadOnce();
});

createRoot(document.getElementById("root")!).render(<App />);

