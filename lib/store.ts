// Veri katmanı: Vercel'de Upstash Redis, yerel denemede bellek.
import { Redis } from "@upstash/redis";

type Hash = Record<string, string>;

interface Store {
  kind: "redis" | "memory";
  hgetall(key: string): Promise<Hash>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, values: Hash): Promise<void>;
  hsetnx(key: string, field: string, value: string): Promise<boolean>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(...keys: string[]): Promise<void>;
  incr(key: string, ttlSec: number): Promise<number>;
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function redisStore(): Store {
  const r = new Redis({ url, token, automaticDeserialization: false });
  return {
    kind: "redis",
    async hgetall(key) {
      return ((await r.hgetall(key)) as Hash) || {};
    },
    async hget(key, field) {
      return ((await r.hget(key, field)) as string) ?? null;
    },
    async hset(key, values) {
      const entries = Object.entries(values);
      for (let i = 0; i < entries.length; i += 200) {
        await r.hset(key, Object.fromEntries(entries.slice(i, i + 200)));
      }
    },
    async hsetnx(key, field, value) {
      return (await r.hsetnx(key, field, value)) === 1;
    },
    async hdel(key, ...fields) {
      if (fields.length) await r.hdel(key, ...fields);
    },
    async get(key) {
      return ((await r.get(key)) as string) ?? null;
    },
    async set(key, value) {
      await r.set(key, value);
    },
    async del(...keys) {
      if (keys.length) await r.del(...keys);
    },
    async incr(key, ttlSec) {
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, ttlSec);
      return n;
    },
  };
}

function memoryStore(): Store {
  const g = globalThis as any;
  const m: Map<string, any> = (g.__gsMem ||= new Map());
  const h = (k: string): Map<string, string> => {
    if (!m.has(k)) m.set(k, new Map());
    return m.get(k);
  };
  return {
    kind: "memory",
    async hgetall(key) {
      return Object.fromEntries(h(key));
    },
    async hget(key, field) {
      return h(key).get(field) ?? null;
    },
    async hset(key, values) {
      for (const [f, v] of Object.entries(values)) h(key).set(f, v);
    },
    async hsetnx(key, field, value) {
      if (h(key).has(field)) return false;
      h(key).set(field, value);
      return true;
    },
    async hdel(key, ...fields) {
      for (const f of fields) h(key).delete(f);
    },
    async get(key) {
      return m.get(key) ?? null;
    },
    async set(key, value) {
      m.set(key, value);
    },
    async del(...keys) {
      for (const k of keys) m.delete(k);
    },
    async incr(key, ttlSec) {
      const cur = m.get(key);
      const now = Date.now();
      const v = cur && cur.exp > now ? cur.n + 1 : 1;
      m.set(key, { n: v, exp: cur && cur.exp > now ? cur.exp : now + ttlSec * 1000 });
      return v;
    },
  };
}

export const store: Store = url && token ? redisStore() : memoryStore();

export const K = {
  guests: "gs:guests",
  checkins: "gs:checkins",
  settings: "gs:settings",
  prizes: "gs:prizes",
  winners: "gs:winners",
  tc: "gs:tc",
};

export type Guest = {
  t: string; // davetiye kodu
  n: string; // ad soyad
  no?: string; // sıra / sicil no
  d?: string; // departman
  p?: string; // telefon
  k?: number; // kişi sayısı
  h?: string; // TC kimlik özeti (açık TC saklanmaz)
  tl?: string; // TC son 3 hane (yönetimde tanımak için)
};
export type Checkin = { at: number; g: string };
export type Prize = { id: string; name: string; qty: number };
export type Winner = {
  id: string;
  prizeId: string;
  prizeName: string;
  t: string;
  n: string;
  no?: string;
  d?: string;
  at: number;
  status: "won" | "absent";
};
export type Settings = {
  title: string;
  subtitle: string;
  date: string;
  place: string;
  note: string;
  giftAtEntry: boolean;
  drawOnlyPresent: boolean;
};

export const defaultSettings: Settings = {
  title: "Gönenli Süt",
  subtitle: "Personel Yemeği ve Eğlencesi",
  date: "",
  place: "Tokyay Bahçe, Gönen",
  note: "Girişte bu davetiyeyi görevliye okutunuz.",
  giftAtEntry: true,
  drawOnlyPresent: true,
};

export async function getSettings(): Promise<Settings> {
  const raw = await store.get(K.settings);
  return { ...defaultSettings, ...(raw ? JSON.parse(raw) : {}) };
}

export async function getGuests(): Promise<Record<string, Guest>> {
  const all = await store.hgetall(K.guests);
  const out: Record<string, Guest> = {};
  for (const [t, v] of Object.entries(all)) out[t] = JSON.parse(v);
  return out;
}

export async function getCheckins(): Promise<Record<string, Checkin>> {
  const all = await store.hgetall(K.checkins);
  const out: Record<string, Checkin> = {};
  for (const [t, v] of Object.entries(all)) out[t] = JSON.parse(v);
  return out;
}

export async function getPrizes(): Promise<Prize[]> {
  const raw = await store.get(K.prizes);
  return raw ? JSON.parse(raw) : [];
}

export async function getWinners(): Promise<Winner[]> {
  const all = await store.hgetall(K.winners);
  return Object.values(all)
    .map((v) => JSON.parse(v) as Winner)
    .sort((a, b) => a.at - b.at);
}

const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function newToken(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += ALPHA[b % 32];
  return s;
}

export function randomIndex(n: number): number {
  // Tarafsız rastgele seçim
  const max = Math.floor(0xffffffff / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= max);
  return buf[0] % n;
}

export function normName(s: string): string {
  return (s || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}
