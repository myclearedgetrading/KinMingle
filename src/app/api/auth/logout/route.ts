import { assertSameOrigin, json } from "@/lib/http";
import { clearSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  await clearSessionCookie();
  return json({ ok: true });
}
