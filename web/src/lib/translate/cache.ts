"use client";

const LS_KEY = "translation.cache.v1";
let mem: Record<string, string> = {};
let loaded = false;

function load() {
  if (loaded) return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) mem = JSON.parse(raw) || {};
  } catch {}
  loaded = true;
}

function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(mem));
  } catch {}
}

export function getCachedTranslation(key: string): string | undefined {
  load();
  return mem[key];
}

export function setCachedTranslation(key: string, value: string) {
  load();
  mem[key] = value;
  save();
}

export function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
