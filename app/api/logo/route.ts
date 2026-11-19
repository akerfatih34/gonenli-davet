import { requireRole } from "@/lib/auth";
import { store, K, getSettings } from "@/lib/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEYS = ["client", "venue"];
const MAX = 600 * 1024;

// Logo resmi (herkese açık)
export async function GET(req: Request) {
  const k = new URL(req.url).searchParams.get("k") || "";
  if (!KEYS.includes(k)) return new Response("?", { status: 400 });
  const raw = await store.get(K.logo(k));
  if (!raw) return new Response("yok", { status: 404 });
  const { type, b64 } = JSON.parse(raw);
  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=300" },
  });
}

async function fetchBytes(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (davet-sistemi)" }, redirect: "follow" }).catch(() => {
    throw new Error("Adrese ulaşılamadı. Adresi kontrol edin veya logoyu dosya olarak yükleyin.");
  });
  if (!r.ok) throw new Error(`Adres açılamadı (${r.status})`);
  return { type: (r.headers.get("content-type") || "").split(";")[0].trim(), buf: Buffer.from(await r.arrayBuffer()), url: r.url };
}

function fromDataUrl(d: string) {
  const m = d.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) throw new Error("Geçersiz resim");
  return { type: m[1], buf: Buffer.from(m[2], "base64") };
}

// Sayfadan logoyu bul: önce adında/alt yazısında "logo" geçen resim, sonra apple-touch-icon / og:image
function findLogo(html: string, base: string): string | null {
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const attr = (tag: string, a: string) => tag.match(new RegExp(`\\b${a}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const logoImg = imgs.find((t) => /logo/i.test(t));
  let src = logoImg && (attr(logoImg, "src") || attr(logoImg, "data-src"));
  if (!src) {
    const link = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/i)?.[0];
    src = link && attr(link, "href");
  }
  if (!src) {
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
    src = og && attr(og, "content");
  }
  if (!src) return null;
  if (src.startsWith("data:")) return src.replace(/&amp;/g, "&");
  return new URL(src.replace(/&amp;/g, "&"), base).toString();
}

// { k, src } — src: resim adresi, site adresi ya da data:image/...;  { k, remove: true }
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const { k, src, remove } = await req.json();
  if (!KEYS.includes(k)) return Response.json({ error: "?" }, { status: 400 });
  const settings = await getSettings();
  if (remove) {
    await store.del(K.logo(k));
    const logos = { ...settings.logos };
    delete (logos as any)[k];
    await store.set(K.settings, JSON.stringify({ ...settings, logos }));
    return Response.json({ ok: true });
  }
  try {
    let img: { type: string; buf: Buffer };
    const s = String(src || "").trim();
    if (s.startsWith("data:")) img = fromDataUrl(s);
    else {
      if (!/^https?:\/\//i.test(s)) throw new Error("Adres http:// veya https:// ile başlamalı");
      const r = await fetchBytes(s);
      if (r.type.startsWith("image/")) img = r;
      else {
        const found = findLogo(r.buf.toString("utf8"), r.url);
        if (!found) throw new Error("Sayfada logo bulunamadı. Logonun resim adresini yapıştırın veya dosya yükleyin.");
        img = found.startsWith("data:") ? fromDataUrl(found) : await fetchBytes(found);
        if (!img.type.startsWith("image/")) throw new Error("Bulunan logo bir resim değil.");
      }
    }
    if (img.buf.length > MAX) throw new Error("Logo çok büyük (en fazla 600 KB).");
    await store.set(K.logo(k), JSON.stringify({ type: img.type, b64: img.buf.toString("base64") }));
    const v = Date.now();
    await store.set(K.settings, JSON.stringify({ ...settings, logos: { ...settings.logos, [k]: v } }));
    return Response.json({ ok: true, v, type: img.type, bytes: img.buf.length });
  } catch (e: any) {
    return Response.json({ error: e.message || "Logo alınamadı" }, { status: 400 });
  }
}
