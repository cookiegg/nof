"use client";
import { useEffect } from "react";
import { useLatestEquityMap } from "@/lib/api/hooks/useModelSnapshots";
import { useRouter } from "next/navigation";

export default function ModelsIndexRedirect() {
  const { map, isLoading } = useLatestEquityMap();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    const ids = Object.keys(map || {});
    if (ids.length > 0) router.replace(`/models/${encodeURIComponent(ids[0])}`);
  }, [isLoading, map, router]);
  return null;
}

