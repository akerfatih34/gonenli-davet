import { store, K, getSettings } from "@/lib/store";
export const dynamic = "force-dynamic";
// Davetiye sayfası için herkese açık; sadece o koda ait isim döner
export async function GET(req: Request) {
  const t = (new URL(req.url).searchParams.get("t") || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const gv = t && (await store.hget(K.guests, t));
  if (!gv) return Response.json({ error: "Davetiye bulunamadı" }, { status: 404 });
  const g = JSON.parse(gv);
  return Response.json({ guest: { t: g.t, n: g.n, k: g.k || 1 }, settings: await getSettings() });
}
