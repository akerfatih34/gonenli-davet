import { createHmac } from "crypto";

// TC kimlik numarası doğrulama (resmi algoritma)
export function validTc(raw: string): boolean {
  const tc = String(raw || "").replace(/\D/g, "");
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = tc.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

// TC numarası açık saklanmaz; sadece geri çevrilemez özeti tutulur.
// DİKKAT: TC_SALT liste yüklendikten sonra değiştirilmemeli.
const SALT = process.env.TC_SALT || "gonenli-sut-davet";
export function hashTc(raw: string): string {
  const tc = String(raw || "").replace(/\D/g, "");
  return createHmac("sha256", SALT).update(tc).digest("hex").slice(0, 32);
}
