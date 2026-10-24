import { makeInviteCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("Join a circle first.", 401);
  if (auth.active.role !== "owner") return error("Only the person who started the circle can change the code.", 403);
  const family = await prisma.family.update({
    where: { id: auth.active.family.id },
    data: { inviteCode: makeInviteCode() },
  });
  return json({ inviteCode: family.inviteCode });
}
