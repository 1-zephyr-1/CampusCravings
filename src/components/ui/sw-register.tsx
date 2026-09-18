"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once the app mounts on the client.
 * Mounted from the root layout so every route gets the same offline shell.
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Defer registration until after first paint so it doesn't block hydration.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Surface failures in dev; swallow silently in production to avoid
          // alarming end users if the SW is blocked (e.g. third-party iframe).
          if (process.env.NODE_ENV !== "production") {
            console.warn("[CampusCravings] SW registration failed:", err);
          }
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
