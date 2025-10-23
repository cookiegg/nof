export const BASE_URL = (process.env.NEXT_PUBLIC_NOF1_API_BASE_URL || "https://nof1.ai/api") as const;

export async function fetcher<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    // Ensure no-cache semantics but allow browser caching heuristics
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const apiUrl = (path: string) => `${BASE_URL}${path}`;
