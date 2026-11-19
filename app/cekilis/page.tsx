"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, logoUrl } from "@/lib/client";

type Prize = { id: string; name: string; qty: number; left: number };
type Winner = { id: string; prizeId: string; prizeName: string; t: string; n: string; no?: string; d?: string; at: number; status: "won" | "absent" };

export default function Cekilis() {
  const [data, setData] = useState<{ prizes: Prize[]; winners: Winner[]; poolSize: number; sample: string[]; settings: any } | null>(null);
  const [prizeId, setPrizeId] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "rolling" | "revealed">("idle");
  const [display, setDisplay] = useState("");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [err, setErr] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const load = useCallback(async () => {
    const d = await api("/api/draw");
    setData(d);
    setPrizeId((cur) => {
      const still = d.prizes.find((p: Prize) => p.id === cur && p.left > 0);
      return still ? cur : d.prizes.find((p: Prize) => p.left > 0)?.id || "";
    });
    return d;
  }, []);
  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [load]);

  const prize = data?.prizes.find((p) => p.id === prizeId);

  async function draw() {
    if (!prize || phaseRef.current === "rolling") return;
    setErr("");
    let w: Winner;
    try {
      w = (await api("/api/draw", { body: { action: "draw", prizeId: prize.id } })).winner;
    } catch (e: any) {
      setErr(e.message);
      return;
    }
    setWinner(w);
    setPhase("rolling");
    const names = data!.sample.length ? data!.sample : [w.n];
    // Yavaşlayan isim çarkı
    let delay = 45;
    let i = 0;
    const start = Date.now();
    await new Promise<void>((done) => {
      const tick = () => {
        setDisplay(names[i++ % names.length]);
        const el = Date.now() - start;
        if (el > 4200) return done();
        delay = 45 + Math.pow(el / 4200, 3) * 380;
        setTimeout(tick, delay);
      };
      tick();
    });
    setDisplay(w.n);
    setPhase("revealed");
    confetti(canvasRef.current!);
  }

  async function next() {
    setPhase("idle");
    setWinner(null);
    setDisplay("");
    await load();
  }

  async function absent() {
    if (!winner) return;
    await api("/api/draw", { body: { action: "absent", id: winner.id } });
    const d = await load();
    setPhase("idle");
    // aynı hediye için yeniden çek
    setPrizeId(winner.prizeId);
    setTimeout(() => document.getElementById("drawbtn")?.click(), 300);
    void d;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (phaseRef.current === "idle") document.getElementById("drawbtn")?.click();
        else if (phaseRef.current === "revealed") document.getElementById("nextbtn")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const won = data?.winners.filter((w) => w.status === "won") || [];
  const allDone = data && data.prizes.length > 0 && data.prizes.every((p) => p.left <= 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "#fff",
        background: "radial-gradient(circle at 50% 0%, #1f5f9a 0, #0e3a63 40%, #071d33 100%)",
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 30, width: "100%", height: "100%" }} />
      <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        {logoUrl(data?.settings, "client") ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: "12px 26px", marginBottom: 8 }}>
            <img src={logoUrl(data?.settings, "client")} alt="" style={{ height: 90, maxWidth: 300, objectFit: "contain", display: "block" }} />
          </div>
        ) : (
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#f3d27a", fontWeight: 800 }}>{data?.settings?.title?.toLocaleUpperCase("tr-TR")}</div>
        )}
        <div style={{ fontSize: 54, fontWeight: 900, marginTop: 6, textShadow: "0 4px 30px #0008" }}>🎁 HEDİYE ÇEKİLİŞİ</div>

        {!data && !err && <div style={{ marginTop: 40 }}>Yükleniyor…</div>}
        {data && !data.prizes.length && (
          <div style={{ marginTop: 40, fontSize: 22, opacity: 0.85 }}>
            Henüz hediye eklenmedi. <a href="/yonetim#cekilis" style={{ color: "#f3d27a" }}>Yönetim → Çekiliş Hediyeleri</a>
          </div>
        )}

        {prize && phase !== "revealed" && (
          <div style={{ marginTop: 36 }}>
            <div style={{ opacity: 0.75, fontSize: 20 }}>Sıradaki hediye</div>
            <div style={{ fontSize: 60, fontWeight: 900, color: "#f3d27a", lineHeight: 1.1, marginTop: 6 }}>{prize.name}</div>
            <div style={{ opacity: 0.7, fontSize: 18, marginTop: 6 }}>
              {prize.left} / {prize.qty} adet kaldı
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 36,
            minHeight: 170,
            width: "min(1000px, 90%)",
            display: "grid",
            placeItems: "center",
            borderRadius: 28,
            background: phase === "revealed" ? "linear-gradient(135deg,#c99a2e,#f3d27a)" : "#ffffff12",
            border: "2px solid #ffffff22",
            color: phase === "revealed" ? "#0e3a63" : "#fff",
            transition: "background .4s",
            padding: 24,
          }}
        >
          {phase === "idle" && <div style={{ fontSize: 30, opacity: 0.55 }}>Havuzda {data?.poolSize ?? 0} kişi</div>}
          {phase === "rolling" && <div style={{ fontSize: 64, fontWeight: 800, filter: "blur(.4px)" }}>{display}</div>}
          {phase === "revealed" && winner && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>🎉 KAZANAN 🎉</div>
              <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1.05, marginTop: 6 }}>{winner.n}</div>
              <div style={{ fontSize: 24, marginTop: 8, fontWeight: 700 }}>
                {winner.prizeName}
                {winner.d ? ` · ${winner.d}` : ""}
                {winner.no ? ` · No ${winner.no}` : ""}
              </div>
            </div>
          )}
        </div>

        {err && <div style={{ marginTop: 16, color: "#fca5a5", fontSize: 20 }}>{err}</div>}
        {allDone && phase === "idle" && <div style={{ marginTop: 26, fontSize: 32, color: "#f3d27a", fontWeight: 800 }}>Tüm hediyeler çekildi. Teşekkürler! 🎊</div>}

        <div className="row" style={{ marginTop: 34, justifyContent: "center" }}>
          {phase === "idle" && prize && (
            <button id="drawbtn" className="btn gold lg" style={{ fontSize: 26, padding: "20px 46px" }} onClick={draw}>
              ÇEKİLİŞİ BAŞLAT
            </button>
          )}
          {phase === "revealed" && (
            <>
              <button id="nextbtn" className="btn gold lg" onClick={next}>
                ✓ Hediyesini aldı · Sonraki
              </button>
              <button className="btn lg" style={{ background: "#ffffff22" }} onClick={absent}>
                Salonda yok · Yeniden çek
              </button>
            </>
          )}
        </div>
        <div style={{ marginTop: 18, opacity: 0.4, fontSize: 13 }}>Boşluk tuşu: başlat / sonraki</div>
      </section>

      <aside style={{ background: "#00000030", padding: 22, overflowY: "auto", maxHeight: "100vh" }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <b className="grow" style={{ fontSize: 18 }}>
            Kazananlar ({won.length})
          </b>
          <button className="btn sm" style={{ background: "#ffffff22" }} onClick={() => document.documentElement.requestFullscreen?.()}>
            ⛶ Tam ekran
          </button>
        </div>
        {data && data.prizes.length > 0 && (
          <select className="input" style={{ marginBottom: 14, background: "#ffffff15", color: "#fff", borderColor: "#ffffff30" }} value={prizeId} disabled={phase !== "idle"} onChange={(e) => setPrizeId(e.target.value)}>
            {data.prizes.map((p) => (
              <option key={p.id} value={p.id} disabled={p.left <= 0} style={{ color: "#000" }}>
                {p.name} ({p.left}/{p.qty})
              </option>
            ))}
          </select>
        )}
        {[...won].reverse().map((w) => (
          <div key={w.id} style={{ padding: "9px 0", borderBottom: "1px solid #ffffff14" }}>
            <div style={{ fontWeight: 700 }}>{w.n}</div>
            <div style={{ fontSize: 13, color: "#f3d27a" }}>{w.prizeName}</div>
          </div>
        ))}
        {logoUrl(data?.settings, "venue") && (
          <div style={{ marginTop: 24, background: "#fff", borderRadius: 10, padding: "8px 12px", display: "inline-block" }}>
            <img src={logoUrl(data?.settings, "venue")} alt="" style={{ height: 28, display: "block" }} />
          </div>
        )}
        <div style={{ marginTop: 20, fontSize: 12, opacity: 0.5 }}>
          <a href="/yonetim#cekilis" style={{ color: "#fff" }}>
            Yönetim paneli
          </a>
        </div>
      </aside>
    </main>
  );
}

function confetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const W = (canvas.width = innerWidth);
  const H = (canvas.height = innerHeight);
  const colors = ["#f3d27a", "#c99a2e", "#ffffff", "#2f7cc1", "#16a34a", "#e11d48"];
  const parts = Array.from({ length: 260 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H * 0.45,
    vx: (Math.random() - 0.5) * 22,
    vy: -Math.random() * 22 - 6,
    r: Math.random() * 6 + 4,
    c: colors[(Math.random() * colors.length) | 0],
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.3,
  }));
  const t0 = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.45;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (t - t0 < 5000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(frame);
}
