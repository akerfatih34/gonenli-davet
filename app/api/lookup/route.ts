import { store, K } from "@/lib/store";
import { validTc, hashTc } from "@/lib/tc";
import { getRole } from "@/lib/auth";
export const dynamic = "force-dynamic";

// Personel TC ile kendi davetiyesini bulur. Deneme sayısı sınırlıdır.
export async function POST(req: Request) {
  const { tc } = await req.json().catch(() => ({}));
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const staff = await getRole();
  if (!staff) {
    const n = await store.incr("gs:rl:" + ip, 600);
    if (n > 100) return Response.json({ error: "Çok fazla deneme yaptınız. 10 dakika sonra tekrar deneyin." }, { status: 429 });
  }
  if (!validTc(String(tc || ""))) return Response.json({ error: "TC kimlik numarası geçersiz. Lütfen kontrol edin." }, { status: 400 });
  const t = await store.hget(K.tc, hashTc(String(tc)));
  if (!t) return Response.json({ error: "Bu TC kimlik numarasıyla kayıtlı davetiye bulunamadı. Lütfen İnsan Kaynakları ile görüşün." }, { status: 404 });
  return Response.json({ t });
}
