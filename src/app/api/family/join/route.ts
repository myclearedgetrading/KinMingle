import { normalizeCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { inviteSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = inviteSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const family = await prisma.family.findUnique({ where: { inviteCode: normalizeCode(parsed.data.inviteCode) } });
  if (!family) return error("That invite code doesn't match a circle.");

  await prisma.membership.upsert({
    where: { userId_familyId: { userId: auth.user.id, familyId: family.id } },
    update: {},
    create: { userId: auth.user.id, familyId: family.id, role: "member" },
  });
  await prisma.user.update({ where: { id: auth.user.id }, data: { activeFamilyId: family.id } });
  return json({ ok: true });
}
