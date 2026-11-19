import { requireRole, getRole } from "@/lib/auth";
import { store, K, getGuests, getCheckins, newToken, normName, Guest } from "@/lib/store";
import { hashTc, validTc } from "@/lib/tc";
export const dynamic = "force-dynamic";

// Davetli listesi + girişler (TC özeti istemciye gönderilmez)
export async function GET() {
  const deny = await requireRole("kapi");
  if (deny) return deny;
  const admin = (await getRole()) === "admin";
  const [guests, checkins] = await Promise.all([getGuests(), getCheckins()]);
  const list = Object.values(guests).map(({ h, tl, ...g }) => (admin ? { ...g, tl, hasTc: !!h } : g));
  return Response.json({ guests: list, checkins });
}

type In = Guest & { tc?: string };

// { mode: "replace" | "append" | "update" | "delete", guests | guest | t }
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const body = await req.json();
  const existing = await getGuests();

  if (body.mode === "delete") {
    await store.hdel(K.guests, body.t);
    await store.hdel(K.checkins, body.t);
    delete existing[body.t];
    await rebuildTcIndex(existing);
    return Response.json({ ok: true });
  }

  if (body.mode === "update") {
    const g = body.guest as In;
    const cur = existing[g.t];
    if (!cur) return Response.json({ error: "Bulunamadı" }, { status: 404 });
    const tcErr = tcProblem(g.tc);
    if (tcErr) return Response.json({ error: tcErr }, { status: 400 });
    const next = clean({ ...cur, ...g, h: cur.h, tl: cur.tl }, g.tc);
    const clash = next.h && Object.values(existing).find((x) => x.h === next.h && x.t !== g.t);
    if (clash) return Response.json({ error: `Bu TC numarası zaten ${clash.n} için kayıtlı` }, { status: 400 });
    existing[g.t] = next;
    await store.hset(K.guests, { [g.t]: JSON.stringify(next) });
    await rebuildTcIndex(existing);
    return Response.json({ ok: true });
  }

  const incoming: In[] = (body.guests || []).filter((g: any) => g && g.n);
  const used = new Set(Object.keys(existing));
  // Aynı kişi tekrar yüklenirse davetiye kodu değişmesin (önce TC, sonra isim+no ile eşleştir)
  const byH = new Map<string, string>();
  const byKey = new Map<string, string[]>();
  for (const g of Object.values(existing)) {
    if (g.h) byH.set(g.h, g.t);
    const k = normName(g.n) + "|" + (g.no || "");
    byKey.set(k, [...(byKey.get(k) || []), g.t]);
  }
  const all: Record<string, Guest> = body.mode === "replace" ? {} : { ...existing };
  const taken = new Set<string>();
  let reused = 0;
  const badTc: string[] = [];
  for (const g of incoming) {
    const tc = g.tc && validTc(g.tc) ? g.tc : undefined;
    if (g.tc && !tc) badTc.push(g.n);
    const h = tc ? hashTc(tc) : undefined;
    let t = h && byH.get(h);
    if (!t || taken.has(t)) t = (byKey.get(normName(g.n) + "|" + (g.no || "")) || []).find((x) => !taken.has(x));
    if (body.mode === "append" && t && existing[t]) t = undefined; // eklemede yeni kayıt
    if (t) reused++;
    else {
      do t = newToken();
      while (used.has(t));
      used.add(t);
    }
    taken.add(t);
    all[t] = clean({ ...g, t, h: undefined, tl: undefined }, tc);
  }
  if (body.mode === "replace") {
    const remove = Object.keys(existing).filter((t) => !all[t]);
    for (let i = 0; i < remove.length; i += 500) await store.hdel(K.guests, ...remove.slice(i, i + 500));
  }
  const toWrite: Record<string, string> = {};
  for (const g of incoming.length ? Object.values(all).filter((g) => taken.has(g.t)) : []) toWrite[g.t] = JSON.stringify(g);
  await store.hset(K.guests, toWrite);
  const dupTc = await rebuildTcIndex(all);
  return Response.json({ ok: true, count: incoming.length, reused, badTc, dupTc });
}

function tcProblem(tc?: string) {
  if (!tc) return null;
  return validTc(tc) ? null : "TC kimlik numarası geçersiz";
}

function clean(g: In, tc?: string): Guest {
  const out: Guest = { t: g.t, n: String(g.n).trim() };
  if (g.no) out.no = String(g.no).trim();
  if (g.d) out.d = String(g.d).trim();
  if (g.p) out.p = String(g.p).trim();
  if (g.k && +g.k > 1) out.k = Math.min(50, Math.floor(+g.k));
  if (tc && validTc(tc)) {
    out.h = hashTc(tc);
    out.tl = tc.slice(-3);
  } else if (g.h) {
    out.h = g.h;
    out.tl = g.tl;
  }
  return out;
}

// TC özeti -> davetiye kodu dizini
async function rebuildTcIndex(guests: Record<string, Guest>): Promise<string[]> {
  const idx: Record<string, string> = {};
  const dup: string[] = [];
  for (const g of Object.values(guests)) {
    if (!g.h) continue;
    if (idx[g.h]) dup.push(g.n);
    else idx[g.h] = g.t;
  }
  await store.del(K.tc);
  if (Object.keys(idx).length) await store.hset(K.tc, idx);
  return dup;
}
