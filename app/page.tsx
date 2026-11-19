"use client";
import { useEffect, useState } from "react";
import { logoUrl } from "@/lib/client";

export default function Home() {
  const [tc, setTc] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setS).catch(() => {});
  }, []);

  async function go() {
    setErr("");
    if (tc.length !== 11) return setErr("TC kimlik numarası 11 haneli olmalı.");
    setBusy(true);
    try {
      const r = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tc }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.href = "/d/" + d.t;
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="center">
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ color: "#fff", textAlign: "center", marginBottom: 20 }}>
          {logoUrl(s, "client") ? (
            <div style={{ background: "#fff", borderRadius: 18, padding: "12px 22px", display: "inline-block", marginBottom: 10 }}>
              <img src={logoUrl(s, "client")} alt={s.title} style={{ height: 80, maxWidth: 240, objectFit: "contain", display: "block" }} />
            </div>
          ) : (
            <div style={{ fontSize: 30, fontWeight: 900 }}>{s?.title || "Gönenli Süt"}</div>
          )}
          <div style={{ color: "#f3d27a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontSize: 14, marginTop: 4 }}>
            {s?.subtitle || "Personel Yemeği ve Eğlencesi"}
          </div>
          {(s?.date || s?.place) && (
            <div style={{ opacity: 0.85, marginTop: 10, fontSize: 15 }}>
              {s?.date && <div>📅 {s.date}</div>}
              {s?.place && <div>📍 {s.place}</div>}
            </div>
          )}
          {logoUrl(s, "venue") && (
            <div style={{ background: "#fff", borderRadius: 10, padding: "6px 12px", display: "inline-block", marginTop: 10 }}>
              <img src={logoUrl(s, "venue")} alt="" style={{ height: 26, display: "block" }} />
            </div>
          )}
        </div>
        <div className="pinbox" style={{ maxWidth: "none", textAlign: "left" }}>
          <h2 style={{ color: "var(--navy)", textAlign: "center" }}>🎟️ Davetiyeni Al</h2>
          <p className="muted" style={{ fontSize: 14, textAlign: "center", margin: "8px 0 16px" }}>
            TC kimlik numaranı yaz. Kişisel davetiyen açılacak, telefonuna resim olarak kaydet ve girişte göster.
          </p>
          <input
            className="input mono"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder="TC Kimlik No (11 hane)"
            style={{ fontSize: 24, textAlign: "center", padding: 16, letterSpacing: 3 }}
            value={tc}
            onChange={(e) => setTc(e.target.value.replace(/\D/g, "").slice(0, 11))}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
          {err && <div style={{ color: "var(--bad)", fontWeight: 600, marginTop: 10, fontSize: 14 }}>{err}</div>}
          <button className="btn lg" style={{ width: "100%", marginTop: 14 }} disabled={busy} onClick={go}>
            {busy ? "Aranıyor…" : "Davetiyemi Göster"}
          </button>
          <p className="muted" style={{ fontSize: 11, marginTop: 14, textAlign: "center" }}>
            TC kimlik numaranız sadece davetiyenizi bulmak için kullanılır, açık olarak saklanmaz.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 26, fontSize: 13 }}>
          <a href="/kapi" style={{ color: "#ffffffaa" }}>Görevli girişi</a>
          <span style={{ color: "#ffffff55" }}> · </span>
          <a href="/yonetim" style={{ color: "#ffffffaa" }}>Yönetim</a>
          <span style={{ color: "#ffffff55" }}> · </span>
          <a href="/cekilis" style={{ color: "#ffffffaa" }}>Çekiliş</a>
        </div>
      </div>
    </main>
  );
}
