import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 4 * 60 * 60 * 1000; // Poll every 4 hours
const VERSION_KEY = "druto_app_version";

async function fetchCurrentVersion(): Promise<string | null> {
    try {
        const res = await fetch("/api/version");
        if (!res.ok) return null;
        const data = await res.json();
        return data.version as string;
    } catch {
        return null;
    }
}

/**
 * useAutoUpdate — polls /api/version every 1 hour.
 *
 * On first load, stores the current version in sessionStorage.
 * On subsequent polls, if the version changes it means a new deploy
 * went live. A non-intrusive toast is shown with an "Update Now" action
 * that reloads the page and lets the Service Worker take control.
 *
 * Usage: call once at the App level.
 */
export function useAutoUpdate() {
    const baseVersionRef = useRef<string | null>(null);
    const toastShownRef = useRef(false);

    useEffect(() => {
        // Seed the base version from session — survives tab switches but not new tabs
        const stored = sessionStorage.getItem(VERSION_KEY);

        let mounted = true;

        const checkVersion = async () => {
            const currentVersion = await fetchCurrentVersion();
            if (!currentVersion || !mounted) return;

            // First check: store as our baseline
            if (!baseVersionRef.current) {
                const baseline = stored || currentVersion;
                baseVersionRef.current = baseline;
                sessionStorage.setItem(VERSION_KEY, baseline);
                return;
            }

            // Subsequent checks: compare against our baseline
            if (currentVersion !== baseVersionRef.current && !toastShownRef.current) {
                toastShownRef.current = true;
                toast("A new version of Druto is available.", {
                    description: "Refresh to get the latest experience.",
                    duration: Infinity, // Keep visible until user acts
                    action: {
                        label: "Update Now",
                        onClick: () => {
                            // Clear cached version so next load seeds fresh
                            sessionStorage.removeItem(VERSION_KEY);
                            // Signal SW to skip waiting and take control immediately
                            if ("serviceWorker" in navigator) {
                                navigator.serviceWorker.getRegistration().then((reg) => {
                                    if (reg?.waiting) {
                                        reg.waiting.postMessage({ type: "SKIP_WAITING" });
                                    }
                                });
                            }
                            window.location.reload();
                        },
                    },
                });
            }
        };

        // Seed baseline immediately from sessionStorage — zero network cost
        if (stored) {
            baseVersionRef.current = stored;
        }

        // Delay the FIRST network poll by 2 minutes so it doesn't compete
        // with the real data fetches (customer data, restaurant detail) on page load
        const initialDelay = setTimeout(() => {
            if (mounted) checkVersion();
        }, 2 * 60 * 1000);

        // Then poll every 1 hour
        const interval = setInterval(checkVersion, POLL_INTERVAL_MS);

        return () => {
            mounted = false;
            clearTimeout(initialDelay);
            clearInterval(interval);
        };
    }, []);
}
