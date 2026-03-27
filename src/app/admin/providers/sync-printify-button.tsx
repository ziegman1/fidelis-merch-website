"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncPrintifyButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; created?: number; updated?: number; error?: string } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync-printify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Sync failed" });
        return;
      }
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="bg-brand-accent text-brand-ink hover:bg-brand-accent/90"
      >
        {loading ? "Syncing…" : "Sync Printify products"}
      </Button>
      {result && (
        <p
          className={`text-sm ${result.success ? "text-green-400" : "text-red-400"}`}
        >
          {result.success
            ? `Done. Created: ${result.created ?? 0}, Updated: ${result.updated ?? 0}`
            : result.error}
        </p>
      )}
    </div>
  );
}
