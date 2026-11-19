"use client";
export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.form || (opts.body ? JSON.stringify(opts.body) : undefined),
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/login")) {
    window.location.href = "/giris?next=" + encodeURIComponent(window.location.pathname);
    throw new Error("Giriş gerekli");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hata: " + res.status);
  return data;
}

export const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

export const fmtCode = (t: string) => (t ? t.slice(0, 4) + "-" + t.slice(4) : "");

export function trSearch(s: string) {
  return (s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
}

export function tokenFromScan(text: string): string {
  const s = String(text || "").trim();
  const m = s.match(/\/d\/([0-9A-Za-z-]+)/);
  return (m ? m[1] : s).toUpperCase().replace(/[^0-9A-Z]/g, "");
}
