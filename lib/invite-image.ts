"use client";
// Davetiyeyi telefona kaydedilecek PNG resme çizer (1080 x 1620)
export async function renderInvite(g: { n: string; t: string; k?: number }, s: any, qrDataUrl: string): Promise<Blob> {
  const W = 1080, H = 1620;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const font = (w: number, size: number) => `${w} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const center = (text: string, y: number, f: string, color: string, maxW = W - 120) => {
    x.font = f;
    x.fillStyle = color;
    x.textAlign = "center";
    // uzun isimleri sığdır
    let size = parseInt(f.match(/(\d+)px/)![1]);
    while (x.measureText(text).width > maxW && size > 30) {
      size -= 2;
      x.font = f.replace(/\d+px/, size + "px");
    }
    x.fillText(text, W / 2, y);
  };

  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  const grad = x.createLinearGradient(0, 0, W, 360);
  grad.addColorStop(0, "#0e3a63");
  grad.addColorStop(1, "#2f7cc1");
  x.fillStyle = grad;
  x.fillRect(0, 0, W, 330);
  center(s.title || "", 150, font(900, 78), "#ffffff");
  center((s.subtitle || "").toLocaleUpperCase("tr-TR"), 230, font(700, 38), "#f3d27a");

  center("Sayın", 420, font(500, 36), "#6b7785");
  center(g.n, 500, font(800, 70), "#15202b");
  let y = 540;
  if ((g.k || 1) > 1) {
    x.fillStyle = "#c99a2e";
    const label = `${g.k} KİŞİLİK DAVETİYE`;
    x.font = font(800, 34);
    const w = x.measureText(label).width + 50;
    x.beginPath();
    x.roundRect((W - w) / 2, 545, w, 60, 14);
    x.fill();
    center(label, 587, font(800, 34), "#ffffff");
    y = 620;
  }

  const img = new Image();
  img.src = qrDataUrl;
  await img.decode();
  const q = 620;
  x.drawImage(img, (W - q) / 2, y + 30, q, q);
  center(g.t.slice(0, 4) + "-" + g.t.slice(4), y + q + 110, "800 54px ui-monospace, Menlo, monospace", "#0e3a63");

  let iy = y + q + 200;
  if (s.date) {
    center("📅 " + s.date, iy, font(600, 38), "#15202b");
    iy += 60;
  }
  if (s.place) {
    center("📍 " + s.place, iy, font(600, 38), "#15202b");
    iy += 60;
  }
  x.fillStyle = "#c99a2e";
  x.fillRect(0, H - 110, W, 110);
  center(s.note || "Girişte bu davetiyeyi görevliye okutunuz.", H - 45, font(700, 32), "#ffffff");

  return await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}
