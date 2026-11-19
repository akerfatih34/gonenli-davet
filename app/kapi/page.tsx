"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, fmtTime, fmtCode, trSearch, tokenFromScan } from "@/lib/client";

type Guest = { t: string; n: string; no?: string; d?: string; k?: number };
type Checkin = { at: number; g: string };
type Result = {
  kind: "ok" | "duplicate" | "notfound" | "offline";
  guest?: Guest;
  checkin?: Checkin;
  code?: string;
};
type QItem = { t: string; g: string; at: number };

const LS = { gate: "gs_gate", guests: "gs_guests", checkins: "gs_checkins", queue: "gs_queue" };
const load = (k: string, d: any) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "") ?? d;
  } catch {
    return d;
  }
};
const save = (k: string, v: any) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

let audio: AudioContext | null = null;
function beep(kind: Result["kind"]) {
  try {
    audio ||= new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = kind === "ok" || kind === "offline" ? [880, 1320] : [220, 180, 220];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = kind === "ok" || kind === "offline" ? "sine" : "square";
      o.frequency.value = f;
      g.gain.value = 0.15;
      o.connect(g).connect(audio!.destination);
      const t = audio!.currentTime + i * 0.13;
      o.start(t);
      o.stop(t + 0.11);
    });
    navigator.vibrate?.(kind === "ok" || kind === "offline" ? 80 : [200, 80, 200]);
  } catch {}
}

export default function Kapi() {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState("Kapı 1");
  const [giftAtEntry, setGiftAtEntry] = useState(true);
  const [guests, setGuests] = useState<Record<string, Guest>>({});
  const [checkins, setCheckins] = useState<Record<string, Checkin>>({});
  const [queue, setQueue] = useState<QItem[]>([]);
  const [online, setOnline] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<(Result & { at: number })[]>([]);
  const [q, setQ] = useState("");
  const [cam, setCam] = useState<"off" | "on" | "error">("off");
  const [camErr, setCamErr] = useState("");
  const [flash, setFlash] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ t: string; at: number }>({ t: "", at: 0 });
  const stateRef = useRef({ guests, checkins, queue, gate });
  stateRef.current = { guests, checkins, queue, gate };
  const timerRef = useRef<any>(null);

  // İlk yükleme
  useEffect(() => {
    setGate(load(LS.gate, "Kapı 1"));
    setGuests(load(LS.guests, {}));
    setCheckins(load(LS.checkins, {}));
    setQueue(load(LS.queue, []));
    api("/api/me")
      .then((me) => {
        setGiftAtEntry(me.settings.giftAtEntry);
        setReady(true);
      })
      .catch((e) => {
        // Çevrimdışıysa önbellekle devam et
        if (!/Giriş/.test(e.message)) setReady(true);
      });
  }, []);

  // Listeyi düzenli tazele (çevrimdışı çalışabilmek için)
  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/guests");
      const map: Record<string, Guest> = {};
      for (const g of data.guests) map[g.t] = g;
      setGuests(map);
      // Kuyrukta bekleyen yerel girişleri koru
      const merged = { ...data.checkins };
      for (const it of stateRef.current.queue) merged[it.t] ||= { at: it.at, g: it.g };
      setCheckins(merged);
      save(LS.guests, map);
      save(LS.checkins, merged);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    refresh();
    const i = setInterval(refresh, 20000);
    return () => clearInterval(i);
  }, [ready, refresh]);

  // Çevrimdışı kuyruğu gönder
  useEffect(() => {
    const i = setInterval(async () => {
      const qu: QItem[] = stateRef.current.queue;
      if (!qu.length) return;
      const left: QItem[] = [];
      for (const it of qu) {
        try {
          await api("/api/checkin", { body: it });
          setOnline(true);
        } catch {
          left.push(it);
          setOnline(false);
        }
      }
      setQueue(left);
      save(LS.queue, left);
    }, 5000);
    return () => clearInterval(i);
  }, []);

  const show = useCallback((r: Result) => {
    setResult(r);
    beep(r.kind);
    setRecent((x) => [{ ...r, at: Date.now() }, ...x].slice(0, 15));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setResult(null), r.kind === "ok" || r.kind === "offline" ? 2600 : 4500);
  }, []);

  const checkIn = useCallback(
    async (raw: string) => {
      const t = tokenFromScan(raw);
      if (!t || busyRef.current) return;
      const now = Date.now();
      if (lastRef.current.t === t && now - lastRef.current.at < 5000) return; // aynı kodu tekrar tekrar okuma
      lastRef.current = { t, at: now };
      busyRef.current = true;
      const { guests, checkins, queue, gate } = stateRef.current;
      try {
        const r = await api("/api/checkin", { body: { t, g: gate } });
        setOnline(true);
        if (r.status === "ok") {
          const c = { ...stateRef.current.checkins, [t]: r.checkin };
          setCheckins(c);
          save(LS.checkins, c);
          show({ kind: "ok", guest: r.guest, checkin: r.checkin });
        } else if (r.status === "duplicate") show({ kind: "duplicate", guest: r.guest, checkin: r.checkin });
        else show({ kind: "notfound", code: t });
      } catch (e: any) {
        // İnternet yok: telefondaki listeyle kontrol et
        setOnline(false);
        const g = guests[t];
        if (!g) show({ kind: "notfound", code: t });
        else if (checkins[t]) show({ kind: "duplicate", guest: g, checkin: checkins[t] });
        else {
          const ci = { at: now, g: gate };
          const nq = [...queue, { t, g: gate, at: now }];
          const nc = { ...checkins, [t]: ci };
          setQueue(nq);
          setCheckins(nc);
          save(LS.queue, nq);
          save(LS.checkins, nc);
          show({ kind: "offline", guest: g, checkin: ci });
        }
      } finally {
        busyRef.current = false;
      }
    },
    [show]
  );

  async function startCam() {
    // ses kilidini aç (iPhone)
    try {
      audio ||= new (window.AudioContext || (window as any).webkitAudioContext)();
      await audio.resume();
    } catch {}
    try {
      const QrScanner = (await import("qr-scanner")).default;
      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(videoRef.current!, (res: any) => checkIn(res.data), {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 10,
          returnDetailedScanResult: true,
        });
      }
      await scannerRef.current.start();
      setCam("on");
      try {
        setFlash((await scannerRef.current.hasFlash()) ? false : null);
      } catch {}
    } catch (e: any) {
      setCam("error");
      setCamErr(
        String(e?.message || e).includes("ermission") || String(e).includes("NotAllowed")
          ? "Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera izni verin."
          : "Kamera açılamadı: " + (e?.message || e)
      );
    }
  }
  useEffect(() => () => scannerRef.current?.destroy(), []);

  async function toggleFlash() {
    try {
      await scannerRef.current.toggleFlash();
      setFlash(scannerRef.current.isFlashOn());
    } catch {}
  }

  function changeGate() {
    const v = prompt("Bu cihazın kapı adı:", gate);
    if (v && v.trim()) {
      setGate(v.trim());
      save(LS.gate, v.trim());
    }
  }

  const list = useMemo(() => Object.values(guests), [guests]);
  const matches = useMemo(() => {
    const s = trSearch(q.trim());
    if (s.length < 2) return [];
    const code = q.toUpperCase().replace(/[^0-9A-Z]/g, "");
    return list
      .filter((g) => trSearch(g.n).includes(s) || g.no === q.trim() || (code.length >= 4 && g.t.startsWith(code)))
      .slice(0, 12);
  }, [q, list]);

  const arrived = Object.keys(checkins).length;
  const people = Object.keys(checkins).reduce((s, t) => s + (guests[t]?.k || 1), 0);

  if (!ready)
    return (
      <main className="center">
        <div style={{ color: "#fff" }}>Yükleniyor…</div>
      </main>
    );

  return (
    <main style={{ minHeight: "100vh", background: "#0b1a2b", color: "#fff" }}>
      <div className="topbar" style={{ background: "#0a2a49" }}>
        <div className="brand grow">
          Kapı Girişi
          <small>
            <button className="link" onClick={changeGate} style={{ padding: 0, fontSize: 12 }}>
              📍 {gate} (değiştir)
            </button>
          </small>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {arrived}
            <span style={{ opacity: 0.6, fontSize: 15 }}> / {list.length}</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            {people !== arrived ? `${people} kişi · ` : ""}
            {online ? "🟢 Çevrimiçi" : "🟠 Çevrimdışı"}
            {queue.length ? ` · ${queue.length} bekliyor` : ""}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: 14 }}>
        <div
          style={{
            position: "relative",
            borderRadius: 18,
            overflow: "hidden",
            background: "#000",
            aspectRatio: "1 / 1",
            maxHeight: "58vh",
            margin: "0 auto",
          }}
        >
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
          {cam !== "on" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
              <div>
                <button className="btn gold lg" onClick={startCam}>
                  📷 Kamerayı Başlat
                </button>
                {cam === "error" && <div style={{ marginTop: 14, color: "#fca5a5", fontSize: 14 }}>{camErr}</div>}
                {!list.length && (
                  <div style={{ marginTop: 14, color: "#fcd34d", fontSize: 14 }}>
                    Davetli listesi boş. Yönetim panelinden personel listesini yükleyin.
                  </div>
                )}
              </div>
            </div>
          )}
          {flash !== null && cam === "on" && (
            <button className="btn sm ghost" style={{ position: "absolute", right: 10, top: 10 }} onClick={toggleFlash}>
              {flash ? "🔦 Kapat" : "🔦 Fener"}
            </button>
          )}
        </div>

        <div style={{ marginTop: 14, position: "relative" }}>
          <input
            className="input"
            style={{ fontSize: 17, padding: 14 }}
            placeholder="Davetiyesi olmayan: isim, TC no veya kod yaz…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (/^\d{11}$/.test(q.trim())) {
                  // TC kimlik no ile bul
                  api("/api/lookup", { body: { tc: q.trim() } })
                    .then((r) => {
                      lastRef.current = { t: "", at: 0 };
                      checkIn(r.t);
                      setQ("");
                    })
                    .catch((err) => alert(err.message));
                  return;
                }
                const t = tokenFromScan(q);
                if (guests[t] || /\/d\//.test(q)) {
                  checkIn(q);
                  setQ("");
                } else if (matches.length === 1) {
                  checkIn(matches[0].t);
                  setQ("");
                }
              }
            }}
          />
          {matches.length > 0 && (
            <div style={{ background: "#fff", color: "var(--ink)", borderRadius: 12, marginTop: 6, overflow: "hidden" }}>
              {matches.map((g) => (
                <div key={g.t} className="row" style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f6" }}>
                  <div className="grow">
                    <b>{g.n}</b>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {g.no ? `No ${g.no} · ` : ""}
                      {g.d ? `${g.d} · ` : ""}
                      <span className="mono">{fmtCode(g.t)}</span>
                    </div>
                  </div>
                  {checkins[g.t] ? (
                    <span className="pill warn">Geldi {fmtTime(checkins[g.t].at)}</span>
                  ) : (
                    <button
                      className="btn green sm"
                      onClick={() => {
                        lastRef.current = { t: "", at: 0 };
                        checkIn(g.t);
                        setQ("");
                      }}
                    >
                      Giriş Yap
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ opacity: 0.6, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>SON OKUTULANLAR</div>
            {recent.map((r, i) => (
              <div key={i} className="row" style={{ padding: "7px 0", borderBottom: "1px solid #ffffff14", fontSize: 14 }}>
                <span>{r.kind === "ok" ? "✅" : r.kind === "offline" ? "🟡" : r.kind === "duplicate" ? "⚠️" : "❌"}</span>
                <span className="grow">{r.guest?.n || "Geçersiz kod " + (r.code || "")}</span>
                <span style={{ opacity: 0.6 }}>{fmtTime(r.at)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 24, opacity: 0.5, fontSize: 12 }}>
          <a href="/" style={{ color: "#fff" }}>
            Ana menü
          </a>
        </div>
      </div>

      {result && <Overlay r={result} gift={giftAtEntry} onClose={() => setResult(null)} />}
    </main>
  );
}

function Overlay({ r, gift, onClose }: { r: Result; gift: boolean; onClose: () => void }) {
  const ok = r.kind === "ok" || r.kind === "offline";
  const bg = ok ? "#15803d" : r.kind === "duplicate" ? "#c2410c" : "#b91c1c";
  const k = r.guest?.k || 1;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: bg,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
        zIndex: 100,
        animation: "pop .18s ease-out",
      }}
    >
      <style>{`@keyframes pop{from{transform:scale(.96);opacity:.4}to{transform:none;opacity:1}}`}</style>
      <div>
        <div style={{ fontSize: 84, lineHeight: 1 }}>{ok ? "✓" : r.kind === "duplicate" ? "!" : "✕"}</div>
        <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.9, marginTop: 8, letterSpacing: 1 }}>
          {r.kind === "ok" && "HOŞ GELDİNİZ"}
          {r.kind === "offline" && "KAYDEDİLDİ (internet gelince gönderilecek)"}
          {r.kind === "duplicate" && "BU DAVETİYE DAHA ÖNCE OKUTULDU"}
          {r.kind === "notfound" && "GEÇERSİZ DAVETİYE"}
        </div>
        {r.guest && <div style={{ fontSize: 38, fontWeight: 800, marginTop: 14, lineHeight: 1.15 }}>{r.guest.n}</div>}
        {r.guest?.d && <div style={{ fontSize: 18, opacity: 0.85, marginTop: 4 }}>{r.guest.d}</div>}
        {ok && k > 1 && (
          <div style={{ marginTop: 14, display: "inline-block", background: "#fff", color: bg, borderRadius: 12, padding: "6px 18px", fontSize: 26, fontWeight: 900 }}>
            {k} KİŞİ
          </div>
        )}
        {ok && gift && (
          <div style={{ marginTop: 18, fontSize: 24, fontWeight: 800, background: "#ffffff22", padding: "10px 18px", borderRadius: 14 }}>
            🎁 HEDİYESİNİ VERİN
          </div>
        )}
        {r.kind === "duplicate" && r.checkin && (
          <div style={{ fontSize: 20, marginTop: 14 }}>
            Giriş: <b>{fmtTime(r.checkin.at)}</b> · {r.checkin.g}
            <div style={{ fontSize: 15, opacity: 0.85, marginTop: 6 }}>Hediye verilmiş olabilir — kontrol edin.</div>
          </div>
        )}
        {r.kind === "notfound" && (
          <div style={{ fontSize: 17, marginTop: 12, opacity: 0.9 }}>
            Kod: <span className="mono">{r.code}</span>
            <br />
            Kişiyi yardım masasına yönlendirin veya isimle arayın.
          </div>
        )}
        <div style={{ marginTop: 28, opacity: 0.7, fontSize: 14 }}>Devam etmek için dokunun</div>
      </div>
    </div>
  );
}
