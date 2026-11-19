import { requireRole } from "@/lib/auth";
import { store, K, getGuests, getCheckins, getPrizes, getWinners, getSettings, randomIndex, newToken, Winner } from "@/lib/store";
export const dynamic = "force-dynamic";

async function state() {
  const [guests, checkins, prizes, winners, settings] = await Promise.all([getGuests(), getCheckins(), getPrizes(), getWinners(), getSettings()]);
  const drawn = new Set(winners.map((w) => w.t));
  const pool = Object.values(guests).filter((g) => !drawn.has(g.t) && (!settings.drawOnlyPresent || checkins[g.t]));
  const remaining = prizes.map((p) => ({ ...p, left: p.qty - winners.filter((w) => w.prizeId === p.id && w.status === "won").length }));
  return { guests, pool, prizes: remaining, winners, settings };
}

export async function GET() {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const s = await state();
  // Animasyon için havuzdan rastgele 60 isim
  const sample = [...s.pool].sort(() => Math.random() - 0.5).slice(0, 60).map((g) => g.n);
  return Response.json({ prizes: s.prizes, winners: s.winners, poolSize: s.pool.length, sample, settings: s.settings });
}

// { action: "draw", prizeId } | { action: "absent", id } | { action: "undo", id } | { action: "reset" }
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const body = await req.json();
  if (body.action === "reset") {
    await store.del(K.winners);
    return Response.json({ ok: true });
  }
  if (body.action === "absent" || body.action === "undo") {
    const raw = await store.hget(K.winners, body.id);
    if (!raw) return Response.json({ error: "Bulunamadı" }, { status: 404 });
    if (body.action === "undo") await store.hdel(K.winners, body.id);
    else await store.hset(K.winners, { [body.id]: JSON.stringify({ ...JSON.parse(raw), status: "absent" }) });
    return Response.json({ ok: true });
  }
  const s = await state();
  const prize = s.prizes.find((p) => p.id === body.prizeId);
  if (!prize) return Response.json({ error: "Hediye bulunamadı" }, { status: 404 });
  if (prize.left <= 0) return Response.json({ error: "Bu hediyenin tamamı çekildi" }, { status: 400 });
  if (!s.pool.length) return Response.json({ error: "Çekilişe katılacak kimse kalmadı" }, { status: 400 });
  const g = s.pool[randomIndex(s.pool.length)];
  const w: Winner = { id: newToken(10), prizeId: prize.id, prizeName: prize.name, t: g.t, n: g.n, no: g.no, d: g.d, at: Date.now(), status: "won" };
  await store.hset(K.winners, { [w.id]: JSON.stringify(w) });
  return Response.json({ winner: w });
}
