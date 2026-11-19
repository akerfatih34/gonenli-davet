import { roleForPin, setRole } from "@/lib/auth";
export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({}));
  const role = roleForPin(String(pin || ""));
  if (!role) return Response.json({ error: "Şifre hatalı" }, { status: 401 });
  await setRole(role);
  return Response.json({ role });
}
