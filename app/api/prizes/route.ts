import { requireRole } from "@/lib/auth";
import { store, K, getPrizes, Prize, newToken } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  const deny = await requireRole("admin");
  if (deny) return deny;
  return Response.json(await getPrizes());
}
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const { prizes } = await req.json();
  const list: Prize[] = (prizes || [])
    .filter((p: any) => p && String(p.name || "").trim())
    .map((p: any) => ({ id: p.id || newToken(6), name: String(p.name).trim(), qty: Math.max(1, Math.min(500, +p.qty || 1)) }));
  await store.set(K.prizes, JSON.stringify(list));
  return Response.json(list);
}
