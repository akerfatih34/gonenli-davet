import { requireRole } from "@/lib/auth";
import { store, K, Checkin } from "@/lib/store";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const deny = await requireRole("kapi");
  if (deny) return deny;
  const { t: raw, g, at } = await req.json();
  const str = String(raw || "");
  const m = str.match(/\/d\/([0-9A-Za-z-]+)/);
  const t = (m ? m[1] : str).toUpperCase().replace(/[^0-9A-Z]/g, "");
  const gv = await store.hget(K.guests, t);
  if (!gv) return Response.json({ status: "notfound", t });
  const guest = JSON.parse(gv);
  // Çevrimdışı kuyruktan gelen kayıt kendi zamanını taşır
  const when = typeof at === "number" && at < Date.now() + 60000 && at > Date.now() - 86400000 ? at : Date.now();
  const ci: Checkin = { at: when, g: String(g || "Kapı").slice(0, 30) };
  const ok = await store.hsetnx(K.checkins, t, JSON.stringify(ci));
  if (ok) return Response.json({ status: "ok", guest, checkin: ci });
  const prev = JSON.parse((await store.hget(K.checkins, t)) || "{}");
  return Response.json({ status: "duplicate", guest, checkin: prev });
}

// Girişi geri al (yönetici)
export async function DELETE(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const { t } = await req.json();
  await store.hdel(K.checkins, t);
  return Response.json({ ok: true });
}
