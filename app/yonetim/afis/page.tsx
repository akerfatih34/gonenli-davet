"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function Afis() {
  const [qr, setQr] = useState("");
  const [s, setS] = useState<any>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(location.origin);
    QRCode.toDataURL(location.origin, { errorCorrectionLevel: "M", margin: 1, width: 900, color: { dark: "#0e3a63" } }).then(setQr);
    fetch("/api/settings").then((r) => r.json()).then(setS);
  }, []);
  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        body { background: #e5e9ef; }
        .poster { width: 210mm; height: 297mm; margin: 10mm auto; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px #0002; }
        .poster .top { background: linear-gradient(135deg,#0e3a63,#2f7cc1); color: #fff; text-align: center; padding: 18mm 10mm 14mm; }
        @media print { body { background: #fff; } .poster { margin: 0; box-shadow: none; } }
      `}</style>
      <div className="noprint" style={{ textAlign: "center", padding: 12 }}>
        <button className="btn gold" onClick={() => print()}>🖨️ Yazdır</button>
      </div>
      <div className="poster">
        <div className="top">
          <div style={{ fontSize: "34pt", fontWeight: 900 }}>{s?.title}</div>
          <div style={{ fontSize: "15pt", color: "#f3d27a", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>{s?.subtitle}</div>
          <div style={{ fontSize: "14pt", marginTop: 10 }}>
            {s?.date && <span>📅 {s.date}</span>} {s?.place && <span style={{ marginLeft: 14 }}>📍 {s.place}</span>}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8mm 14mm", textAlign: "center" }}>
          <div style={{ fontSize: "30pt", fontWeight: 900, color: "#0e3a63", lineHeight: 1.1 }}>Davetiyeni telefonundan al!</div>
          {qr && <img src={qr} style={{ width: "105mm", height: "105mm", marginTop: "8mm" }} alt="" />}
          <div className="mono" style={{ fontSize: "17pt", fontWeight: 800, color: "#0e3a63", marginTop: "3mm" }}>{origin.replace(/^https?:\/\//, "")}</div>
          <div style={{ display: "flex", gap: "6mm", marginTop: "10mm", fontSize: "13pt", textAlign: "left" }}>
            {["Telefonunun kamerasıyla QR kodu okut", "TC kimlik numaranı yaz", "Davetiyeni resim olarak kaydet, girişte göster"].map((t, i) => (
              <div key={i} style={{ flex: 1, background: "#f6f8fb", borderRadius: "4mm", padding: "5mm", border: "0.3mm solid #e2e8f0" }}>
                <div style={{ fontSize: "22pt", fontWeight: 900, color: "#c99a2e" }}>{i + 1}</div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#c99a2e", color: "#fff", textAlign: "center", padding: "6mm", fontSize: "13pt", fontWeight: 700 }}>
          Telefonu olmayan arkadaşlarımızın davetiyesi İnsan Kaynakları'ndan basılı olarak verilecektir.
        </div>
      </div>
    </>
  );
}
