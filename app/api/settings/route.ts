import { requireRole } from "@/lib/auth";
import { store, K, getSettings, defaultSettings } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getSettings());
}
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const body = await req.json();
  const cur = await getSettings();
  const next: any = { ...cur };
  for (const k of Object.keys(defaultSettings)) if (k in body && k !== "logos") next[k] = body[k];
  await store.set(K.settings, JSON.stringify(next));
  return Response.json(next);
}
