"use client";
import { create } from "zustand";

export type Locale = "zh" | "en";

type LocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  init: () => void;
};

export const useLocale = create<LocaleState>((set) => ({
  locale: "zh",
  setLocale: (l) => {
    try { localStorage.setItem("locale", l); } catch {}
    set({ locale: l });
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
    }
  },
  init: () => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem("locale") : null) as Locale | null;
    const pref: Locale = stored === "en" ? "en" : "zh";
    set({ locale: pref });
    if (typeof document !== "undefined") {
      document.documentElement.lang = pref === "zh" ? "zh-CN" : "en";
    }
  },
}));
