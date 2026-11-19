"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { renderInvite } from "@/lib/invite-image";

export default function Davetiye() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/invite?t=" + encodeURIComponent(token))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        const qr = await QRCode.toDataURL(`${location.origin}/d/${d.guest.t}`, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 700,
          color: { dark: "#0e3a63" },
        });
        const blob = await renderInvite(d.guest, d.settings, qr);
        setImg({ url: URL.createObjectURL(blob), blob });
      })
      .catch((e) => setErr(e.message || "Davetiye bulunamadı"));
  }, [token]);

  const fileName = data ? `davetiye-${data.guest.n.replace(/\s+/g, "-")}.png` : "davetiye.png";

  async function save() {
    if (!img) return;
    const file = new File([img.blob], fileName, { type: "image/png" });
    // Telefonda paylaş menüsü ("Resmi Kaydet") — yoksa indir
    if ((navigator as any).canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Davetiyem" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = img.url;
    a.download = fileName;
    a.click();
    setMsg("Resim indirildi. Galeride / İndirilenler klasöründe bulabilirsiniz.");
  }

  return (
    <main className="center" style={{ alignItems: "start", paddingTop: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {err && (
          <div className="pinbox">
            ❌ {err}
            <div style={{ marginTop: 14 }}>
              <a href="/">← Geri dön</a>
            </div>
          </div>
        )}
        {!err && !img && <div style={{ color: "#fff", textAlign: "center", padding: 40 }}>Davetiyeniz hazırlanıyor…</div>}
        {img && (
          <>
            <img src={img.url} alt="Davetiye" style={{ width: "100%", borderRadius: 22, boxShadow: "0 20px 60px #0007", display: "block" }} />
            <button className="btn gold lg" style={{ width: "100%", marginTop: 16 }} onClick={save}>
              📥 Resim olarak kaydet
            </button>
            {msg && <div style={{ color: "#fff", marginTop: 10, textAlign: "center", fontSize: 14 }}>{msg}</div>}
            <div style={{ color: "#ffffffcc", fontSize: 13, marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
              Düğme çalışmazsa resmin üzerine <b>basılı tutup</b> "Fotoğraflara kaydet" deyin ya da ekran görüntüsü alın.
              <br />
              Girişte ekran parlaklığını artırıp bu resmi gösterin.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
