// Excel/CSV satırlarından davetli listesi çıkarır.
// Desteklenen biçimler: "Sayı | Adı/Soyadı | Sayı | Adı/Soyadı" gibi yan yana bloklar,
// ayrı "Ad" + "Soyad" sütunları, ve isteğe bağlı Departman / Telefon / Kişi sayısı sütunları.

type Cell = string | number | boolean | Date | null | undefined;
export type ImportedGuest = { n: string; no?: string; d?: string; p?: string; k?: number; tc?: string };

const norm = (v: Cell) =>
  String(v ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isFull = (h: string) =>
  /^(ad[ıi]? ?soyad[ıi]?|ad ve soyad[ıi]?|isim ?soyisim|isim|ad[ıi] soyad[ıi]|personel ad[ıi]?( soyad[ıi]?)?|personel|çalışan|katılımcı|davetli|ünvan[ıi]? ad soyad)$/.test(
    h
  ) || (/\bad\b|ad[ıi]/.test(h) && /soyad/.test(h));
const isFirst = (h: string) => /^(ad|ad[ıi]|isim|ilk ad)$/.test(h);
const isLast = (h: string) => /^(soyad|soyad[ıi]|soyisim)$/.test(h);
const isTc = (h: string) => /kimlik|tckn|^tc( no| numarası)?$|^t c( kimlik)?|tc kimlik/.test(h);
const isNo = (h: string) => /^(sayı|sıra|sira|no|sıra no|sicil|sicil no|personel no|numara|s n|#)$/.test(h) || /sicil|sıra no/.test(h);
const isDept = (h: string) => /departman|bölüm|birim|görev|ünite|şube|kısım/.test(h);
const isPhone = (h: string) => /telefon|tel|gsm|cep/.test(h);
const isCount = (h: string) => /kişi|kisi|adet|katılımcı sayısı|misafir/.test(h);

function clean(v: Cell): string {
  if (v instanceof Date) return v.toLocaleDateString("tr-TR");
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

export function parseRows(rows: Cell[][]): { guests: ImportedGuest[]; info: string[] } {
  const info: string[] = [];
  let headerRow = -1;
  let nameCols: number[] = [];
  let mode: "full" | "split" = "full";

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const hs = (rows[r] || []).map(norm);
    const full = hs.map((h, i) => (isFull(h) ? i : -1)).filter((i) => i >= 0);
    if (full.length) {
      headerRow = r;
      nameCols = full;
      break;
    }
    const firsts = hs.map((h, i) => (isFirst(h) ? i : -1)).filter((i) => i >= 0);
    if (firsts.length && hs.some(isLast)) {
      headerRow = r;
      nameCols = firsts;
      mode = "split";
      break;
    }
  }

  if (headerRow < 0) {
    // Başlık yok: en çok yazı içeren sütunu isim kabul et
    const counts: number[] = [];
    rows.slice(0, 50).forEach((row) =>
      (row || []).forEach((c, i) => {
        if (typeof c === "string" && /[a-zçğıöşü]{2,} [a-zçğıöşü]{2,}/i.test(c)) counts[i] = (counts[i] || 0) + 1;
      })
    );
    let best = -1;
    counts.forEach((c, i) => {
      if (best < 0 || c > counts[best]) best = i;
    });
    if (best < 0) return { guests: [], info: ["Dosyada ad soyad sütunu bulunamadı."] };
    nameCols = [best];
    headerRow = -1;
    info.push("Başlık satırı bulunamadı; isimler " + (best + 1) + ". sütundan alındı.");
  }

  const header = headerRow >= 0 ? (rows[headerRow] || []).map(norm) : [];
  const firstHeaderCol = header.findIndex((h) => h !== "");
  const period = nameCols.length > 1 ? nameCols[1] - nameCols[0] : Math.max(header.length, nameCols[0] + 1);
  const offset = headerRow >= 0 ? nameCols[0] - Math.max(0, firstHeaderCol) : nameCols[0];

  const blocks = nameCols.map((nc) => {
    const start = nc - offset;
    const cols = Array.from({ length: period }, (_, i) => start + i);
    const find = (fn: (h: string) => boolean) => cols.find((c) => c !== nc && fn(header[c] || ""));
    return {
      name: nc,
      last: mode === "split" ? find(isLast) : undefined,
      tc: find(isTc),
      no: find((h) => isNo(h) && !isTc(h)),
      d: find(isDept),
      p: find(isPhone),
      k: find(isCount),
    };
  });
  if (nameCols.length > 1) info.push(`Listede ${nameCols.length} yan yana blok algılandı.`);

  const guests: ImportedGuest[] = [];
  for (const block of blocks) {
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      let n = clean(row[block.name]);
      if (block.last !== undefined) n = `${n} ${clean(row[block.last])}`.trim();
      if (!n || n.length < 3 || isFull(norm(n))) continue;
      const g: ImportedGuest = { n };
      if (block.no !== undefined && clean(row[block.no])) g.no = clean(row[block.no]);
      if (block.tc !== undefined) {
        const tc = clean(row[block.tc]).replace(/\.0+$/, "").replace(/\D/g, "");
        if (tc) g.tc = tc;
      }
      if (block.d !== undefined && clean(row[block.d])) g.d = clean(row[block.d]);
      if (block.p !== undefined && clean(row[block.p])) g.p = clean(row[block.p]);
      if (block.k !== undefined) {
        const k = parseInt(clean(row[block.k]), 10);
        if (k > 0 && k < 50) g.k = k;
      }
      guests.push(g);
    }
  }

  // Sıra numarasına göre sırala (varsa)
  if (guests.every((g) => g.no && /^\d+$/.test(g.no))) guests.sort((a, b) => +a.no! - +b.no!);
  const found = [
    blocks[0].tc !== undefined && "TC kimlik no",
    blocks[0].no !== undefined && "sıra/sicil no",
    blocks[0].d !== undefined && "departman",
    blocks[0].p !== undefined && "telefon",
    blocks[0].k !== undefined && "kişi sayısı",
  ].filter(Boolean);
  info.push(found.length ? `Bulunan ek sütunlar: ${found.join(", ")}.` : "Sadece ad soyad bilgisi bulundu.");
  return { guests, info };
}

export function parseCsv(text: string): Cell[][] {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
