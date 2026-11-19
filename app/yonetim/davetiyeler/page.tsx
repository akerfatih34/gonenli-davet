"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, fmtCode } from "@/lib/client";

type Guest = { t: string; n: string; no?: string; d?: string; k?: number };

export default function Davetiyeler() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [s, setS] = useState<any>(null);
  const [sort, setSort] = useState<"no" | "name">("no");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const me = await api("/api/me");
      setS(me.settings);
      const d = await api("/api/guests");
      setGuests(d.guests);
      const out: Record<string, string> = {};
      let i = 0;
      for (const g of d.guests as Guest[]) {
        out[g.t] = await QRCode.toDataURL(`${location.origin}/d/${g.t}`, { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#0e3a63" } });
        if (++i % 50 === 0) {
          setProgress(i);
          await new Promise((r) => setTimeout(r));
        }
      }
      setQr(out);
      setProgress(i);
    })();
  }, []);

  const list = [...guests].sort((a, b) =>
    sort === "no" ? (+a.no! || 1e9) - (+b.no! || 1e9) || a.n.localeCompare(b.n, "tr") : a.n.localeCompare(b.n, "tr")
  );
  const ready = guests.length > 0 && Object.keys(qr).length === guests.length;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        body { background: #e5e9ef; }
        .sheet { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: repeat(4, 74.25mm);
          background: #fff; margin: 10mm auto; box-shadow: 0 4px 20px #0002; page-break-after: always; break-after: page; overflow: hidden; }
        .inv { border: 0.2mm dashed #b8c2cc; padding: 5mm 5mm 4mm 6mm; display: flex; gap: 3mm; position: relative; overflow: hidden; }
        .inv:before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2.2mm; background: linear-gradient(#0e3a63, #2f7cc1); }
        .inv .l { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .inv .brand { font-size: 13pt; font-weight: 800; color: #0e3a63; letter-spacing: .2px; }
        .inv .sub { font-size: 7.5pt; color: #c99a2e; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-top: .6mm; }
        .inv .dear { font-size: 7pt; color: #6b7785; margin-top: 4mm; }
        .inv .name { font-size: 13pt; font-weight: 800; color: #15202b; line-height: 1.12; margin-top: .6mm; word-break: break-word; }
        .inv .meta { margin-top: auto; font-size: 7.3pt; color: #333; line-height: 1.45; }
        .inv .note { font-size: 6.3pt; color: #6b7785; margin-top: 1.2mm; }
        .inv .r { width: 36mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .inv .r img { width: 34mm; height: 34mm; }
        .inv .code { font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; font-weight: 700; color: #0e3a63; margin-top: 1mm; letter-spacing: .5px; }
        .inv .no { font-size: 6.5pt; color: #6b7785; }
        .inv .kisi { margin-top: 1mm; font-size: 7pt; font-weight: 800; color: #fff; background: #c99a2e; padding: .4mm 2mm; border-radius: 1mm; }
        @media print { body { background: #fff; } .sheet { margin: 0; box-shadow: none; } }
      `}</style>
      <div className="noprint" style={{ position: "sticky", top: 0, zIndex: 5, background: "#0e3a63", color: "#fff", padding: 12 }}>
        <div className="row" style={{ maxWidth: 900, margin: "0 auto" }}>
          <b className="grow">
            {ready ? `${guests.length} davetiye hazır · ${Math.ceil(guests.length / 8)} sayfa` : `QR kodlar hazırlanıyor… ${progress}/${guests.length || "?"}`}
          </b>
          <select className="input" style={{ width: 170 }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="no">Sıra no'ya göre</option>
            <option value="name">Alfabetik</option>
          </select>
          <button className="btn gold" disabled={!ready} onClick={() => window.print()}>
            🖨️ Yazdır / PDF kaydet
          </button>
        </div>
        <div style={{ maxWidth: 900, margin: "6px auto 0", fontSize: 12, opacity: 0.8 }}>
          İpucu: Yazdır penceresinde "Kenar boşlukları: Yok", "Ölçek: %100" ve "Arka plan grafikleri: Açık" seçin. Matbaaya göndermek için "PDF olarak kaydet" deyin.
        </div>
      </div>
      {s &&
        Array.from({ length: Math.ceil(list.length / 8) }).map((_, p) => (
          <div className="sheet" key={p}>
            {list.slice(p * 8, p * 8 + 8).map((g) => (
              <div className="inv" key={g.t}>
                <div className="l">
                  <div className="brand">{s.title}</div>
                  <div className="sub">{s.subtitle}</div>
                  <div className="dear">Sayın</div>
                  <div className="name">{g.n}</div>
                  <div className="meta">
                    {s.date && <div>📅 {s.date}</div>}
                    {s.place && <div>📍 {s.place}</div>}
                    {s.note && <div className="note">{s.note}</div>}
                  </div>
                </div>
                <div className="r">
                  {qr[g.t] && <img src={qr[g.t]} alt="" />}
                  <div className="code">{fmtCode(g.t)}</div>
                  {g.no && <div className="no">No {g.no}</div>}
                  {(g.k || 1) > 1 && <div className="kisi">{g.k} KİŞİLİK</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
    </>
  );
}
