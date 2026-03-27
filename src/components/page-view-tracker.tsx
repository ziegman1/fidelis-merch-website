"use client";

import { useEffect } from "react";

/**
 * Sends a page view to /api/track. Only runs on storefront pages.
 */
export function PageViewTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/api")) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {});
  }, []);
  return null;
}
