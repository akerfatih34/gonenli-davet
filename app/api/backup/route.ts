import { requireRole } from "@/lib/auth";
import { store, K, Guest } from "@/lib/store";
import { hashTc } from "@/lib/tc";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// TC özetlerinin aynı TC_SALT ile üretildiğini anlamak için sabit bir kontrol değeri
const saltCheck = () => hashTc("10000000146");

// Tüm verinin yedeği (JSON dosyası olarak iner)
export async function GET() {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const [guests, checkins, winners, settings, prizes, lc, lv] = await Promise.all([
    store.hgetall(K.guests),
    store.hgetall(K.checkins),
    store.hgetall(K.winners),
    store.get(K.settings),
    store.get(K.prizes),
    store.get(K.logo("client")),
    store.get(K.logo("venue")),
  ]);
  const data = {
    app: "gonenli-davet",
    version: 1,
    createdAt: new Date().toISOString(),
    saltCheck: saltCheck(),
    guests,
    checkins,
    winners,
    settings: settings ? JSON.parse(settings) : null,
    prizes: prizes ? JSON.parse(prizes) : [],
    logos: { client: lc ? JSON.parse(lc) : null, venue: lv ? JSON.parse(lv) : null },
  };
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="davet-yedek-${day}.json"`,
    },
  });
}

// Yedekten geri yükle: mevcut verinin yerine geçer. { data, withCheckins }
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const { data, withCheckins } = await req.json();
  if (!data || data.app !== "gonenli-davet" || !data.guests) return Response.json({ error: "Bu dosya bu sistemin yedeği değil." }, { status: 400 });

  const sameSalt = data.saltCheck === saltCheck();
  const guests: Record<string, string> = {};
  const tcIdx: Record<string, string> = {};
  for (const [t, v] of Object.entries<string>(data.guests)) {
    const g: Guest = JSON.parse(v);
    if (!sameSalt) {
      delete g.h;
      delete g.tl;
    } else if (g.h) tcIdx[g.h] = t;
    guests[t] = JSON.stringify(g);
  }

  await store.del(K.guests, K.checkins, K.winners, K.tc, K.prizes, K.settings, K.logo("client"), K.logo("venue"));
  if (Object.keys(guests).length) await store.hset(K.guests, guests);
  if (Object.keys(tcIdx).length) await store.hset(K.tc, tcIdx);
  if (withCheckins) {
    if (data.checkins && Object.keys(data.checkins).length) await store.hset(K.checkins, data.checkins);
    if (data.winners && Object.keys(data.winners).length) await store.hset(K.winners, data.winners);
  }
  if (data.prizes) await store.set(K.prizes, JSON.stringify(data.prizes));
  const settings = { ...(data.settings || {}), logos: {} as any };
  for (const k of ["client", "venue"]) {
    const l = data.logos?.[k];
    if (l?.b64) {
      await store.set(K.logo(k), JSON.stringify(l));
      settings.logos[k] = Date.now();
    }
  }
  await store.set(K.settings, JSON.stringify(settings));
  return Response.json({
    ok: true,
    guests: Object.keys(guests).length,
    tcKept: sameSalt,
    checkins: withCheckins ? Object.keys(data.checkins || {}).length : 0,
  });
}
