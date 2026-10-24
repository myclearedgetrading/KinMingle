import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { switchSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = switchSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const membership = auth.memberships.find((item) => item.family.id === parsed.data.familyId);
  if (!membership) return error("You aren't in that circle.", 403);
  await prisma.user.update({ where: { id: auth.user.id }, data: { activeFamilyId: parsed.data.familyId } });
  return json({ ok: true });
}
