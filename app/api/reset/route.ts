import { requireRole } from "@/lib/auth";
import { store, K } from "@/lib/store";
// { what: "checkins" | "all" }
export async function POST(req: Request) {
  const deny = await requireRole("admin");
  if (deny) return deny;
  const { what } = await req.json();
  if (what === "checkins") await store.del(K.checkins, K.winners);
  else if (what === "all") await store.del(K.guests, K.checkins, K.winners, K.prizes, K.settings, K.tc, K.logo("client"), K.logo("venue"));
  else return Response.json({ error: "?" }, { status: 400 });
  return Response.json({ ok: true });
}
