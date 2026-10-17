"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server component tree every few seconds (live charges). */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
