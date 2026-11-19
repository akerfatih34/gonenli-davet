import { requireRole } from "@/lib/auth";
import { getGuests, getCheckins, getWinners } from "@/lib/store";
export const dynamic = "force-dynamic";
const esc = (v: any) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const fmt = (ms: number) => new Date(ms).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

// ?type=katilim | links | cekilis
export async function GET(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "katilim";
  const origin = url.searchParams.get("origin") || url.origin;
  const [guests, checkins, winners] = await Promise.all([getGuests(), getCheckins(), getWinners()]);
  const list = Object.values(guests).sort((a, b) => (+a.no! || 0) - (+b.no! || 0) || a.n.localeCompare(b.n, "tr"));
  let rows: any[][] = [];
  let name = "rapor";
  if (type === "katilim") {
    name = "katilim-raporu";
    rows.push(["Sıra No", "Ad Soyad", "Departman", "Kişi", "Durum", "Giriş Saati", "Kapı", "Davetiye Kodu"]);
    for (const g of list) {
      const c = checkins[g.t];
      rows.push([g.no, g.n, g.d, g.k || 1, c ? "GELDİ" : "GELMEDİ", c ? fmt(c.at) : "", c?.g, g.t]);
    }
  } else if (type === "links") {
    name = "davetiye-linkleri";
    rows.push(["Sıra No", "Ad Soyad", "Telefon", "Davetiye Kodu", "Davetiye Linki"]);
    for (const g of list) rows.push([g.no, g.n, g.p, g.t, `${origin}/d/${g.t}`]);
  } else {
    name = "cekilis-sonuclari";
    rows.push(["Sıra", "Hediye", "Ad Soyad", "Sıra No", "Departman", "Durum", "Saat"]);
    winners.forEach((w, i) => rows.push([i + 1, w.prizeName, w.n, w.no, w.d, w.status === "won" ? "KAZANDI" : "SALONDA YOK", fmt(w.at)]));
  }
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}
