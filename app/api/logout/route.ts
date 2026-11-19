import { clearRole } from "@/lib/auth";
export async function POST() {
  await clearRole();
  return Response.json({ ok: true });
}
