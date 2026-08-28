"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const ACTIVE = ["queued", "scraping", "analyzing", "generating"];

/**
 * Keeps the server-rendered dashboard fresh: Supabase Realtime when available,
 * 10s polling fallback while a run is active.
 */
export function RunStatusRefresher({ runStatus }: { runStatus: string | null }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const refresh = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      setTimeout(() => (refreshing.current = false), 1500);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("pipeline-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_runs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "scrape_jobs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_assets" }, refresh)
      .subscribe();

    const interval =
      runStatus && ACTIVE.includes(runStatus) ? setInterval(refresh, 10_000) : undefined;

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [router, runStatus]);

  return null;
}
