import { makeInviteCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { familySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth?.active) return error("Join a circle first.", 401);
  const members = await prisma.membership.findMany({
    where: { familyId: auth.active.family.id },
    include: { user: { select: { id: true, name: true, avatarColor: true, bio: true } } },
    orderBy: { createdAt: "asc" },
  });
  return json({
    family: auth.active.family,
    role: auth.active.role,
    members: members.map((member) => ({
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
      user: member.user,
    })),
  });
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = familySchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const family = await prisma.family.create({
    data: {
      name: parsed.data.name,
      inviteCode: makeInviteCode(),
      memberships: { create: { userId: auth.user.id, role: "owner" } },
    },
  });
  await prisma.user.update({ where: { id: auth.user.id }, data: { activeFamilyId: family.id } });
  return json({ ok: true, familyId: family.id });
}
