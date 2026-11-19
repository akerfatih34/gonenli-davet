"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fmtTime, fmtCode, trSearch, logoUrl } from "@/lib/client";

type Guest = { t: string; n: string; no?: string; d?: string; p?: string; k?: number; tl?: string; hasTc?: boolean; tc?: string };
type Checkin = { at: number; g: string };
type Settings = {
  title: string;
  subtitle: string;
  date: string;
  place: string;
  note: string;
  giftAtEntry: boolean;
  drawOnlyPresent: boolean;
  logos?: { client?: number; venue?: number };
};
type Tab = "ozet" | "liste" | "davetiye" | "cekilis" | "ayar";

export default function Yonetim() {
  const [tab, setTab] = useState<Tab>("ozet");
  const [me, setMe] = useState<any>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Checkin>>({});
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/guests");
      setGuests(d.guests);
      setCheckins(d.checkins);
      setErr("");
    } catch (e: any) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    api("/api/me").then((m) => {
      if (m.role !== "admin") {
        window.location.href = "/giris?next=/yonetim";
        return;
      }
      setMe(m);
      if (location.hash) setTab(location.hash.slice(1) as Tab);
      load();
    });
  }, [load]);

  useEffect(() => {
    if (!me || tab !== "ozet") return;
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [me, tab, load]);

  if (!me) return <div className="wrap">Yükleniyor…</div>;

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", "#" + t);
  };

  return (
    <>
      <div className="topbar noprint">
        <div className="brand grow">
          {me.settings.title}
          <small>{me.settings.subtitle} · Yönetim</small>
        </div>
        <a href="/kapi">Kapı</a>
        <a href="/cekilis">Çekiliş</a>
        <button
          className="link"
          onClick={async () => {
            await api("/api/logout", { body: {} });
            location.href = "/giris";
          }}
        >
          Çıkış
        </button>
      </div>
      <div className="tabs noprint">
        {(
          [
            ["ozet", "📊 Canlı Durum"],
            ["liste", "👥 Davetliler"],
            ["davetiye", "🎟️ Davetiyeler"],
            ["cekilis", "🎁 Çekiliş Hediyeleri"],
            ["ayar", "⚙️ Ayarlar"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="wrap">
        {me.warnings?.map((w: string) => (
          <div key={w} className="alert">
            ⚠️ {w}
          </div>
        ))}
        {err && <div className="alert">{err}</div>}
        {tab === "ozet" && <Ozet guests={guests} checkins={checkins} />}
        {tab === "liste" && <Liste guests={guests} checkins={checkins} reload={load} />}
        {tab === "davetiye" && <Davetiye guests={guests} />}
        {tab === "cekilis" && <Hediyeler />}
        {tab === "ayar" && <Ayarlar initial={me.settings} reload={load} />}
      </div>
    </>
  );
}

/* ---------------- Canlı durum ---------------- */
function Ozet({ guests, checkins }: { guests: Guest[]; checkins: Record<string, Checkin> }) {
  const map = useMemo(() => Object.fromEntries(guests.map((g) => [g.t, g])), [guests]);
  const arrived = Object.keys(checkins).filter((t) => map[t]);
  const invitedPeople = guests.reduce((s, g) => s + (g.k || 1), 0);
  const people = arrived.reduce((s, t) => s + (map[t].k || 1), 0);
  const pct = guests.length ? Math.round((arrived.length / guests.length) * 100) : 0;
  const gates: Record<string, number> = {};
  arrived.forEach((t) => (gates[checkins[t].g] = (gates[checkins[t].g] || 0) + 1));
  const last = arrived.sort((a, b) => checkins[b].at - checkins[a].at).slice(0, 15);

  // 15 dakikalık dilimler
  const buckets: Record<string, number> = {};
  arrived.forEach((t) => {
    const d = new Date(checkins[t].at);
    d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
    const k = fmtTime(d.getTime());
    buckets[k] = (buckets[k] || 0) + 1;
  });
  const bk = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b));
  const maxB = Math.max(1, ...bk.map(([, v]) => v));

  const depts: Record<string, [number, number]> = {};
  guests.forEach((g) => {
    if (!g.d) return;
    depts[g.d] ||= [0, 0];
    depts[g.d][1]++;
    if (checkins[g.t]) depts[g.d][0]++;
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="stats">
        <div className="stat">
          <span>Davetli</span>
          <b>{guests.length}</b>
          {invitedPeople !== guests.length && <span>{invitedPeople} kişi</span>}
        </div>
        <div className="stat">
          <span>Giriş yapan</span>
          <b style={{ color: "var(--ok)" }}>{arrived.length}</b>
          <div className="bar">
            <i style={{ width: pct + "%" }} />
          </div>
        </div>
        <div className="stat">
          <span>Katılım oranı</span>
          <b>%{pct}</b>
        </div>
        <div className="stat">
          <span>İçerideki kişi</span>
          <b>{people}</b>
        </div>
        <div className="stat">
          <span>Henüz gelmeyen</span>
          <b style={{ color: "var(--muted)" }}>{guests.length - arrived.length}</b>
        </div>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card grow" style={{ minWidth: 280 }}>
          <h3 style={{ marginBottom: 12 }}>Geliş saatleri (15 dk)</h3>
          {!bk.length && <div className="muted">Henüz giriş yok.</div>}
          {bk.map(([k, v]) => (
            <div key={k} className="row" style={{ marginBottom: 6, fontSize: 13 }}>
              <span className="mono" style={{ width: 46 }}>
                {k}
              </span>
              <div style={{ flex: 1, background: "#eef3f8", borderRadius: 6, height: 18 }}>
                <div style={{ width: (v / maxB) * 100 + "%", background: "var(--blue)", height: "100%", borderRadius: 6 }} />
              </div>
              <b style={{ width: 36, textAlign: "right" }}>{v}</b>
            </div>
          ))}
          {Object.keys(gates).length > 0 && (
            <div className="row" style={{ marginTop: 14 }}>
              {Object.entries(gates).map(([g, n]) => (
                <span key={g} className="pill no">
                  {g}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card grow" style={{ minWidth: 280 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <h3 className="grow">Son girenler</h3>
            <a className="btn sm ghost" href="/api/export?type=katilim">
              ⬇ Katılım raporu (Excel)
            </a>
          </div>
          {last.map((t) => (
            <div key={t} className="row" style={{ padding: "6px 0", borderBottom: "1px solid #f0f3f7", fontSize: 14 }}>
              <span className="grow">{map[t].n}</span>
              <span className="muted">{checkins[t].g}</span>
              <b className="mono">{fmtTime(checkins[t].at)}</b>
            </div>
          ))}
          {!last.length && <div className="muted">Henüz giriş yok.</div>}
        </div>
      </div>

      {Object.keys(depts).length > 1 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Departmanlara göre</h3>
          {Object.entries(depts)
            .sort((a, b) => b[1][1] - a[1][1])
            .map(([d, [a, n]]) => (
              <div key={d} className="row" style={{ marginBottom: 6, fontSize: 14 }}>
                <span style={{ width: 180 }}>{d}</span>
                <div className="bar grow" style={{ marginTop: 0 }}>
                  <i style={{ width: (a / n) * 100 + "%" }} />
                </div>
                <b style={{ width: 70, textAlign: "right" }}>
                  {a}/{n}
                </b>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Davetliler ---------------- */
function Liste({ guests, checkins, reload }: { guests: Guest[]; checkins: Record<string, Checkin>; reload: () => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [preview, setPreview] = useState<{ guests: Guest[]; info: string[]; file: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [add, setAdd] = useState({ n: "", no: "", tc: "", d: "", p: "", k: "1" });
  const [edit, setEdit] = useState<Guest | null>(null);

  const sorted = useMemo(
    () => [...guests].sort((a, b) => (+a.no! || 1e9) - (+b.no! || 1e9) || a.n.localeCompare(b.n, "tr")),
    [guests]
  );
  const shown = useMemo(() => {
    const s = trSearch(q.trim());
    const code = q.toUpperCase().replace(/[^0-9A-Z]/g, "");
    return sorted.filter(
      (g) =>
        (filter === "all" || (filter === "in") === !!checkins[g.t]) &&
        (!s || trSearch(g.n).includes(s) || g.no === q.trim() || (code.length >= 4 && g.t.startsWith(code)) || trSearch(g.d || "").includes(s))
    );
  }, [sorted, q, filter, checkins]);

  const dupNames = useMemo(() => {
    if (!preview) return [];
    const c: Record<string, number> = {};
    preview.guests.forEach((g) => (c[trSearch(g.n)] = (c[trSearch(g.n)] || 0) + 1));
    return preview.guests.filter((g) => c[trSearch(g.n)] > 1).map((g) => g.n);
  }, [preview]);

  async function upload(file: File) {
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api("/api/import", { form: fd });
      if (!r.guests.length) throw new Error(r.info.join(" ") || "Listede isim bulunamadı");
      setPreview({ ...r, file: file.name });
    } catch (e: any) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveImport(mode: "replace" | "append") {
    if (!preview) return;
    if (mode === "replace" && guests.length && !confirm("Mevcut liste bu dosyayla değiştirilecek. Aynı isimlerin davetiye kodları korunur. Devam?")) return;
    setBusy(true);
    try {
      const r = await api("/api/guests", { body: { mode, guests: preview.guests } });
      setMsg(
        `✅ ${r.count} kişi kaydedildi.` +
          (r.reused ? ` ${r.reused} kişinin eski davetiye kodu korundu.` : "") +
          (r.badTc?.length ? ` ⚠️ TC numarası hatalı olanlar (davetiyeyi kendileri alamaz): ${r.badTc.join(", ")}.` : "") +
          (r.dupTc?.length ? ` ⚠️ Aynı TC iki kişide: ${r.dupTc.join(", ")}.` : "")
      );
      setPreview(null);
      reload();
    } catch (e: any) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addOne() {
    if (!add.n.trim()) return;
    const r = await api("/api/guests", { body: { mode: "append", guests: [{ ...add, k: +add.k || 1 }] } });
    if (r.badTc?.length) alert("TC kimlik numarası geçersiz olduğu için kaydedilmedi; kişi eklendi ama davetiyesini TC ile alamaz.");
    setAdd({ n: "", no: "", tc: "", d: "", p: "", k: "1" });
    reload();
  }

  async function toggle(g: Guest) {
    if (checkins[g.t]) {
      if (!confirm(`${g.n} için girişi geri almak istiyor musunuz?`)) return;
      await api("/api/checkin", { method: "DELETE", body: { t: g.t } });
    } else await api("/api/checkin", { body: { t: g.t, g: "Yönetim" } });
    reload();
  }

  async function remove(g: Guest) {
    if (!confirm(`${g.n} listeden silinsin mi?`)) return;
    await api("/api/guests", { body: { mode: "delete", t: g.t } });
    reload();
  }

  async function saveEdit() {
    if (!edit) return;
    try {
      await api("/api/guests", { body: { mode: "update", guest: { ...edit, k: +(edit.k as any) || 1 } } });
    } catch (e: any) {
      alert(e.message);
      return;
    }
    setEdit(null);
    reload();
  }

  const link = (t: string) => `${location.origin}/d/${t}`;
  const wa = (g: Guest) => {
    const phone = (g.p || "").replace(/\D/g, "").replace(/^0/, "90");
    const text = `Sayın ${g.n}, Gönenli Süt personel yemeğine davetlisiniz. Girişte okutacağınız kişisel davetiyeniz: ${link(g.t)}`;
    return `https://wa.me/${phone.length >= 10 ? (phone.length === 10 ? "90" + phone : phone) : ""}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3>Personel listesini yükle</h3>
        <p className="muted" style={{ fontSize: 14, margin: "6px 0 12px" }}>
          Gönenli Süt'ün gönderdiği Excel (.xlsx) veya CSV dosyasını seçin. "Ad Soyad" sütunu otomatik bulunur; yan yana iki sütunlu listeler,
          sıra no, <b>TC kimlik no</b>, departman, telefon ve kişi sayısı sütunları da tanınır. Personelin davetiyesini kendisinin alabilmesi
          için listede TC kimlik no sütunu olmalı.{" "}
          <a href="/personel-listesi-sablonu.xlsx" download>
            Boş Excel şablonunu indir
          </a>
        </p>
        <input type="file" accept=".xlsx,.csv,.txt" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {msg && <div style={{ marginTop: 10, fontWeight: 600 }}>{msg}</div>}
        {preview && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <b>
              {preview.file}: {preview.guests.length} kişi bulundu
            </b>
            <ul className="muted" style={{ fontSize: 14 }}>
              {preview.info.map((i) => (
                <li key={i}>{i}</li>
              ))}
              {dupNames.length > 0 && <li>Aynı isimden birden fazla var: {[...new Set(dupNames)].join(", ")} (ayrı davetiyeler oluşturulur)</li>}
            </ul>
            <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
              <table className="t">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Ad Soyad</th>
                    <th>Departman</th>
                    <th>Telefon</th>
                    <th>Kişi</th>
                    <th>TC</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.guests.slice(0, 50).map((g, i) => (
                    <tr key={i}>
                      <td>{g.no}</td>
                      <td>{g.n}</td>
                      <td>{g.d}</td>
                      <td>{g.p}</td>
                      <td>{g.k || 1}</td>
                      <td className="mono">{g.tc ? "••••••••" + g.tc.slice(-3) : <span className="muted">yok</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" disabled={busy} onClick={() => saveImport("replace")}>
                {guests.length ? "Mevcut listeyi bununla değiştir" : "Listeyi kaydet"}
              </button>
              {guests.length > 0 && (
                <button className="btn ghost" disabled={busy} onClick={() => saveImport("append")}>
                  Mevcut listeye ekle
                </button>
              )}
              <button className="btn ghost" onClick={() => setPreview(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tek kişi ekle</h3>
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>Son dakika eklenen personel veya misafir için.</p>
        <div className="row" style={{ marginTop: 10 }}>
          <input className="input" style={{ flex: 3, minWidth: 180 }} placeholder="Ad Soyad" value={add.n} onChange={(e) => setAdd({ ...add, n: e.target.value })} />
          <input className="input" style={{ flex: 1, minWidth: 80 }} placeholder="Sıra no" value={add.no} onChange={(e) => setAdd({ ...add, no: e.target.value })} />
          <input className="input mono" style={{ flex: 2, minWidth: 140 }} placeholder="TC kimlik no" inputMode="numeric" value={add.tc} onChange={(e) => setAdd({ ...add, tc: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
          <input className="input" style={{ flex: 2, minWidth: 120 }} placeholder="Departman" value={add.d} onChange={(e) => setAdd({ ...add, d: e.target.value })} />
          <input className="input" style={{ flex: 2, minWidth: 120 }} placeholder="Telefon" value={add.p} onChange={(e) => setAdd({ ...add, p: e.target.value })} />
          <input className="input" style={{ width: 80 }} type="number" min={1} title="Kişi sayısı" value={add.k} onChange={(e) => setAdd({ ...add, k: e.target.value })} />
          <button className="btn" onClick={addOne}>
            Ekle
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row" style={{ padding: 14 }}>
          <input className="input grow" style={{ minWidth: 200 }} placeholder="İsim, sıra no veya kod ara…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ width: 170 }} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">Hepsi ({guests.length})</option>
            <option value="in">Gelenler ({Object.keys(checkins).length})</option>
            <option value="out">Gelmeyenler ({guests.length - Object.keys(checkins).length})</option>
          </select>
          <a className="btn ghost" href={`/api/export?type=links&origin=${encodeURIComponent(typeof location !== "undefined" ? location.origin : "")}`}>
            ⬇ Davetiye linkleri
          </a>
          <a className="btn ghost" href="/api/export?type=katilim">
            ⬇ Katılım raporu
          </a>
        </div>
        <div style={{ maxHeight: "65vh", overflow: "auto" }}>
          <table className="t">
            <thead>
              <tr>
                <th>No</th>
                <th>Ad Soyad</th>
                <th>Kod</th>
                <th>Durum</th>
                <th style={{ textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 400).map((g) => (
                <tr key={g.t}>
                  <td className="muted">{g.no}</td>
                  <td>
                    <b>{g.n}</b>
                    {(g.d || (g.k || 1) > 1) && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {g.d}
                        {(g.k || 1) > 1 ? ` · ${g.k} kişi` : ""}
                      </div>
                    )}
                  </td>
                  <td className="mono">
                    {fmtCode(g.t)}
                    <div className="muted" style={{ fontSize: 11 }}>{g.hasTc ? "TC •••" + g.tl : "TC yok"}</div>
                  </td>
                  <td>
                    {checkins[g.t] ? (
                      <span className="pill ok">
                        Geldi {fmtTime(checkins[g.t].at)} · {checkins[g.t].g}
                      </span>
                    ) : (
                      <span className="pill no">Gelmedi</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className={"btn sm " + (checkins[g.t] ? "ghost" : "green")} onClick={() => toggle(g)}>
                      {checkins[g.t] ? "Geri al" : "Giriş"}
                    </button>{" "}
                    <a className="btn sm ghost" href={`/d/${g.t}`} target="_blank">
                      Davetiye
                    </a>{" "}
                    <a className="btn sm ghost" href={wa(g)} target="_blank" title="WhatsApp ile gönder">
                      WhatsApp
                    </a>{" "}
                    <button className="btn sm ghost" onClick={() => setEdit({ ...g, tc: "" })}>
                      ✎
                    </button>{" "}
                    <button className="btn sm ghost" onClick={() => remove(g)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length > 400 && <div className="muted" style={{ padding: 12 }}>İlk 400 kişi gösteriliyor, aramayı daraltın.</div>}
          {!guests.length && <div className="muted" style={{ padding: 20 }}>Henüz liste yüklenmedi.</div>}
        </div>
      </div>

      {edit && (
        <div style={{ position: "fixed", inset: 0, background: "#0007", display: "grid", placeItems: "center", zIndex: 50 }} onClick={() => setEdit(null)}>
          <div className="card" style={{ width: 420, maxWidth: "92vw" }} onClick={(e) => e.stopPropagation()}>
            <h3>Davetliyi düzenle</h3>
            {(
              [
                ["n", "Ad Soyad"],
                ["no", "Sıra no"],
                ["tc", "TC kimlik no (değiştirmek için yazın)"],
                ["d", "Departman"],
                ["p", "Telefon"],
                ["k", "Kişi sayısı"],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <label className="f">{l}</label>
                <input className="input" value={(edit as any)[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value } as any)} />
              </div>
            ))}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={saveEdit}>
                Kaydet
              </button>
              <button className="btn ghost" onClick={() => setEdit(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Davetiyeler ---------------- */
function Davetiye({ guests }: { guests: Guest[] }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ borderColor: "var(--gold)" }}>
        <h3>🙋 Personel davetiyesini kendisi alır (önerilen)</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Personel sitenin ana sayfasını açar, TC kimlik numarasını yazar, davetiyesi resim olarak açılır ve telefonuna kaydeder. Linki
          WhatsApp gruplarına atmanız ve fabrika panosuna afişi asmanız yeterli. Şu an {guests.filter((g) => g.hasTc).length} / {guests.length}{" "}
          kişinin TC numarası sistemde.
        </p>
        <div className="row">
          <input className="input mono grow" readOnly value={typeof location !== "undefined" ? location.origin : ""} onFocus={(e) => e.target.select()} />
          <a className="btn gold" href="/yonetim/afis" target="_blank">
            🖨️ Pano afişi (QR'lı)
          </a>
        </div>
      </div>
      <div className="card">
        <h3>🖨️ Basılı davetiye kartları</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Telefonu olmayan ya da kendisi almak istemeyenler için. Her A4 sayfaya 8 kart (105 × 74 mm) gelir. Her kartta kişinin adı, kişiye özel QR kodu ve davetiye kodu bulunur. Kesim çizgileri
          bellidir. {guests.length} kişi için yaklaşık {Math.ceil(guests.length / 8)} sayfa.
        </p>
        <a className="btn gold" href="/yonetim/davetiyeler" target="_blank">
          Davetiye sayfasını aç → Yazdır / PDF kaydet
        </a>
      </div>
      <div className="card">
        <h3>📱 Dijital davetiye (WhatsApp / SMS)</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Her kişinin kendine ait bir davetiye sayfası var. Bu linki telefona gönderirseniz kişi girişte QR'ı telefon ekranından gösterir. Liste
          telefon numarası içeriyorsa "Davetliler" sekmesindeki WhatsApp düğmesi mesajı hazır açar. Toplu gönderim için link listesini indirip
          Gönenli Süt İK'ya verebilirsiniz.
        </p>
        <a className="btn ghost" href={`/api/export?type=links&origin=${encodeURIComponent(typeof location !== "undefined" ? location.origin : "")}`}>
          ⬇ Tüm davetiye linkleri (Excel)
        </a>
      </div>
    </div>
  );
}

/* ---------------- Hediyeler ---------------- */
function Hediyeler() {
  const [prizes, setPrizes] = useState<{ id?: string; name: string; qty: number }[]>([]);
  const [state, setState] = useState<any>(null);
  const [bulk, setBulk] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const s = await api("/api/draw");
    setState(s);
    setPrizes(s.prizes.map((p: any) => ({ id: p.id, name: p.name, qty: p.qty })));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(list = prizes) {
    await api("/api/prizes", { body: { prizes: list } });
    setSaved("✅ Kaydedildi");
    setTimeout(() => setSaved(""), 2000);
    load();
  }

  function addBulk() {
    // "3 x Çay seti" veya "Buzdolabı" satırları
    const lines = bulk
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(\d+)\s*(?:x|adet|×|\*)?\s+(.+)$/i) || l.match(/^(.+?)\s*[x×*]\s*(\d+)$/i);
        if (m && /^\d+$/.test(m[1])) return { name: m[2], qty: +m[1] };
        if (m) return { name: m[1], qty: +m[2] };
        return { name: l, qty: 1 };
      });
    const next = [...prizes, ...lines];
    setPrizes(next);
    setBulk("");
    save(next);
  }

  const move = (i: number, d: number) => {
    const n = [...prizes];
    const [x] = n.splice(i, 1);
    n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x);
    setPrizes(n);
  };

  const total = prizes.reduce((s, p) => s + (+p.qty || 0), 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div className="row">
          <h3 className="grow">Çekiliş hediyeleri ({total} adet)</h3>
          <a className="btn gold" href="/cekilis" target="_blank">
            🎬 Çekiliş ekranını aç
          </a>
        </div>
        <p className="muted" style={{ fontSize: 14 }}>
          Çekiliş bu sırayla yapılır. Genelde küçük hediyelerden başlayıp büyük hediyeyle bitirmek heyecanı korur. Çekiliş{" "}
          {state?.settings?.drawOnlyPresent ? <b>sadece girişte okutulan kişiler</b> : <b>listedeki herkes</b>} arasında yapılır; bir kişi en
          fazla bir hediye kazanır. Şu an havuzda <b>{state?.poolSize ?? "…"}</b> kişi var.
        </p>
        <table className="t">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Hediye</th>
              <th style={{ width: 90 }}>Adet</th>
              <th style={{ width: 90 }}>Kalan</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {prizes.map((p, i) => {
              const left = state?.prizes.find((x: any) => x.id === p.id)?.left;
              return (
                <tr key={i}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <input className="input" value={p.name} onChange={(e) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  </td>
                  <td>
                    <input className="input" type="number" min={1} value={p.qty} onChange={(e) => setPrizes(prizes.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))} />
                  </td>
                  <td>{left ?? "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn sm ghost" onClick={() => move(i, -1)}>
                      ↑
                    </button>{" "}
                    <button className="btn sm ghost" onClick={() => move(i, 1)}>
                      ↓
                    </button>{" "}
                    <button className="btn sm ghost" onClick={() => setPrizes(prizes.filter((_, j) => j !== i))}>
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => save()}>
            Hediyeleri kaydet
          </button>
          <span>{saved}</span>
        </div>
        <label className="f">Toplu ekle (her satıra bir hediye; adet için "5 x Çay seti" yazın)</label>
        <textarea className="input" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"10 x Çay seti\n5 x Tost makinesi\nÇamaşır makinesi"} />
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={addBulk}>
          Listeye ekle
        </button>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 className="grow">Kazananlar ({state?.winners.filter((w: any) => w.status === "won").length || 0})</h3>
          <a className="btn sm ghost" href="/api/export?type=cekilis">
            ⬇ Sonuçlar (Excel)
          </a>
          <button
            className="btn sm red"
            onClick={async () => {
              if (!confirm("Tüm çekiliş sonuçları silinsin mi? (Deneme çekilişinden sonra kullanın)")) return;
              await api("/api/draw", { body: { action: "reset" } });
              load();
            }}
          >
            Sonuçları sıfırla
          </button>
        </div>
        <table className="t">
          <tbody>
            {state?.winners.map((w: any, i: number) => (
              <tr key={w.id}>
                <td className="muted">{i + 1}</td>
                <td>{w.prizeName}</td>
                <td>
                  <b>{w.n}</b> {w.no && <span className="muted">No {w.no}</span>}
                </td>
                <td>{w.status === "won" ? <span className="pill ok">Kazandı</span> : <span className="pill warn">Salonda yok</span>}</td>
                <td className="mono">{fmtTime(w.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state?.winners.length && <div className="muted">Henüz çekiliş yapılmadı.</div>}
      </div>
    </div>
  );
}

/* ---------------- Ayarlar ---------------- */
function Ayarlar({ initial, reload }: { initial: Settings; reload: () => void }) {
  const [s, setS] = useState<Settings>(initial);
  const [msg, setMsg] = useState("");
  const f = (k: keyof Settings, l: string, ph = "") => (
    <div>
      <label className="f">{l}</label>
      <input className="input" value={(s as any)[k]} placeholder={ph} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h3>Etkinlik bilgileri (davetiyede görünür)</h3>
        {f("title", "Başlık", "Gönenli Süt")}
        {f("subtitle", "Alt başlık", "Personel Yemeği ve Eğlencesi")}
        {f("date", "Tarih ve saat", "örn. 27 Aralık 2026 Cumartesi · 19:00")}
        {f("place", "Yer", "Tokyay Bahçe, Gönen")}
        {f("note", "Davetiye notu", "Girişte bu davetiyeyi görevliye okutunuz.")}
        <label className="row" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={s.giftAtEntry} onChange={(e) => setS({ ...s, giftAtEntry: e.target.checked })} />
          Girişte hediye verilecek (okutunca "HEDİYESİNİ VERİN" yazsın)
        </label>
        <label className="row" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={s.drawOnlyPresent} onChange={(e) => setS({ ...s, drawOnlyPresent: e.target.checked })} />
          Çekiliş sadece girişte okutulan (gelen) kişiler arasında yapılsın
        </label>
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn"
            onClick={async () => {
              await api("/api/settings", { body: s });
              setMsg("✅ Kaydedildi");
              setTimeout(() => setMsg(""), 2000);
            }}
          >
            Kaydet
          </button>
          <span>{msg}</span>
        </div>
      </div>
      <div className="card">
        <h3>Logolar</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Firmanın web sitesinin adresini yapıştırıp "Getir"e basın, logo otomatik bulunur. Bulunamazsa logonun resim adresini yapıştırın ya da
          dosya yükleyin. Logolar davetiyede, basılı kartta, afişte ve çekiliş ekranında görünür.
        </p>
        <LogoBox k="client" label="Davet eden firma (ana logo)" placeholder="https://www.gonenlisut.com" s={s} setS={setS} />
        <LogoBox k="venue" label="Mekân logosu" placeholder="https://www.tokyaybahce.com" s={s} setS={setS} />
      </div>
      <div className="card">
        <h3>Yedekleme ve taşıma</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Tüm veriyi (davetli listesi, ayarlar, logolar, hediyeler, girişler) tek dosya olarak indirin. Bu dosyayla sistemi başka bir kuruluma
          taşıyabilir ya da geri dönebilirsiniz. Dosyada kişisel veri var, güvenli saklayın.
        </p>
        <div className="row">
          <a className="btn" href="/api/backup">
            ⬇ Yedek al
          </a>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            ⬆ Yedekten yükle
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                let data: any;
                try {
                  data = JSON.parse(await f.text());
                } catch {
                  return alert("Dosya okunamadı.");
                }
                if (!confirm(`Bu sistemdeki tüm veri, ${f.name} yedeğindeki veriyle DEĞİŞTİRİLECEK. Devam?`)) return;
                const withCheckins = confirm("Yedekteki girişler ve çekiliş sonuçları da yüklensin mi?\n(Tamam = evet, İptal = sadece liste ve ayarlar)");
                try {
                  const r = await api("/api/backup", { body: { data, withCheckins } });
                  alert(
                    `Yüklendi: ${r.guests} kişi.` +
                      (r.tcKept ? "" : "\n\nUYARI: Bu kurulumun TC_SALT ayarı farklı olduğu için TC ile davetiye alma çalışmayacak. Ya TC_SALT'ı eski kurulumla aynı yapın ve yedeği tekrar yükleyin, ya da TC'li listeyi yeniden yükleyin.")
                  );
                  location.reload();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
            />
          </label>
        </div>
      </div>
      <div className="card">
        <h3>Deneme ve temizlik</h3>
        <p className="muted" style={{ fontSize: 14 }}>
          Etkinlikten önce birkaç davetiyeyle deneme yapın, sonra "Girişleri sıfırla" ile temizleyin. Etkinlik bittikten ve raporları
          indirdikten sonra kişisel verileri (KVKK) "Her şeyi sil" ile kaldırın.
        </p>
        <div className="row">
          <button
            className="btn ghost"
            onClick={async () => {
              if (!confirm("Tüm girişler ve çekiliş sonuçları silinecek. Davetli listesi kalacak. Emin misiniz?")) return;
              await api("/api/reset", { body: { what: "checkins" } });
              reload();
              alert("Girişler sıfırlandı. Kapıdaki telefonlarda sayfayı yenileyin.");
            }}
          >
            Girişleri ve çekilişi sıfırla
          </button>
          <button
            className="btn red"
            onClick={async () => {
              const v = prompt('Tüm veriler (liste, girişler, çekiliş, ayarlar) silinecek. Onaylamak için SİL yazın.');
              if (v?.toLocaleUpperCase("tr-TR") !== "SİL") return;
              await api("/api/reset", { body: { what: "all" } });
              location.reload();
            }}
          >
            Her şeyi sil
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoBox({ k, label, placeholder, s, setS }: { k: "client" | "venue"; label: string; placeholder: string; s: Settings; setS: (s: Settings) => void }) {
  const [src, setSrc] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(body: any) {
    setBusy(true);
    setMsg("");
    try {
      const r = await api("/api/logo", { body: { k, ...body } });
      setS({ ...s, logos: { ...(s.logos || {}), [k]: body.remove ? undefined : r.v } });
      setMsg(body.remove ? "Kaldırıldı" : "✅ Logo kaydedildi");
      setSrc("");
    } catch (e: any) {
      setMsg("❌ " + e.message);
    } finally {
      setBusy(false);
    }
  }
  const url = logoUrl(s, k);
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
      <b>{label}</b>
      <div className="row" style={{ marginTop: 8 }}>
        <div style={{ width: 160, height: 70, border: "1px dashed var(--line)", borderRadius: 10, display: "grid", placeItems: "center", background: "#fff" }}>
          {url ? <img src={url} alt="" style={{ maxWidth: 150, maxHeight: 60, objectFit: "contain" }} /> : <span className="muted" style={{ fontSize: 12 }}>Logo yok</span>}
        </div>
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="row">
            <input className="input grow" placeholder={placeholder} value={src} onChange={(e) => setSrc(e.target.value)} />
            <button className="btn" disabled={busy || !src.trim()} onClick={() => send({ src: /^https?:/i.test(src.trim()) ? src.trim() : "https://" + src.trim() })}>
              {busy ? "…" : "Getir"}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <label className="btn sm ghost" style={{ cursor: "pointer" }}>
              Dosya yükle
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const rd = new FileReader();
                  rd.onload = () => send({ src: rd.result });
                  rd.readAsDataURL(f);
                }}
              />
            </label>
            {url && (
              <button className="btn sm ghost" disabled={busy} onClick={() => send({ remove: true })}>
                Kaldır
              </button>
            )}
            <span style={{ fontSize: 13 }}>{msg}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
