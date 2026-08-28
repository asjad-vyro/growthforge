"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function LaunchRunButton({ projectId, disabled }: { projectId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch(force = false) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, force }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.status === 409 && json.error === "recent_run_exists") {
      const days = Math.round((Date.now() - new Date(json.lastRunAt).getTime()) / 86_400_000);
      if (
        confirm(
          `Your last trend analysis is only ${days} day(s) old and a full run costs ~$3-4 in API usage. Re-run anyway?`,
        )
      ) {
        return launch(true);
      }
      return;
    }
    if (!res.ok) {
      setError(json.error ?? "launch failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="accent" onClick={() => launch()} disabled={busy || disabled}>
        {busy ? "Launching…" : "Run new analysis"}
      </Button>
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </div>
  );
}
