"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

export default function Giris() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pinRef = useRef("");
  pinRef.current = pin;

  async function submit(p = pinRef.current) {
    if (!p) return;
    setBusy(true);
    setErr("");
    try {
      const { role } = await api("/api/login", { body: { pin: p } });
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !(role === "kapi" && next !== "/kapi")) window.location.href = next;
      else window.location.href = role === "admin" ? "/yonetim" : "/kapi";
    } catch (e: any) {
      setErr(e.message);
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p + e.key).slice(0, 12));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") submit(pinRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const press = (k: string) => {
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k === "✓") submit();
    else setPin((p) => (p + k).slice(0, 12));
  };

  return (
    <main className="center">
      <div className="pinbox">
        <h2 style={{ color: "var(--navy)" }}>Görevli Girişi</h2>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Şifrenizi girin</div>
        <div className="dots">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <i key={i} className={i < pin.length ? "on" : ""} />
          ))}
        </div>
        {err && <div style={{ color: "var(--bad)", fontWeight: 600, marginBottom: 10 }}>{err}</div>}
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"].map((k) => (
            <button
              key={k}
              id={k === "✓" ? "ok" : undefined}
              disabled={busy}
              onClick={() => press(k)}
              style={k === "✓" ? { background: "var(--navy)", color: "#fff" } : undefined}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
