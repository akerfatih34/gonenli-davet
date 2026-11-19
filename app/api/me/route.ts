import { getRole, usingDefaultPins } from "@/lib/auth";
import { store, getSettings } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  const role = await getRole();
  if (!role) return Response.json({ role: null }, { status: 401 });
  return Response.json({
    role,
    settings: await getSettings(),
    warnings: [
      store.kind === "memory" && "Veritabanı (Upstash Redis) bağlı değil — veriler kalıcı değil! Vercel > Storage'dan Upstash ekleyin.",
      role === "admin" && usingDefaultPins && "Varsayılan şifreler kullanılıyor. Vercel'de ADMIN_PIN ve KAPI_PIN tanımlayın.",
    ].filter(Boolean),
  });
}
