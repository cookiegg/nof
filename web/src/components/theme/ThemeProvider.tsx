"use client";
import { useEffect } from "react";
import { useTheme } from "@/store/useTheme";

export default function ThemeProvider() {
  const init = useTheme((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
