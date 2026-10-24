import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("You aren't in a circle.", 400);
  const familyId = auth.active.family.id;
  const count = await prisma.membership.count({ where: { familyId } });

  if (auth.active.role === "owner") {
    if (count > 1) return error("Owners stay while other people are still in the circle.");
    await rm(path.join(process.cwd(), "data", "uploads", familyId), { recursive: true, force: true });
    await prisma.family.delete({ where: { id: familyId } });
  } else {
    await prisma.membership.delete({
      where: { userId_familyId: { userId: auth.user.id, familyId } },
    });
  }

  const next = await prisma.membership.findFirst({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
  });
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { activeFamilyId: next?.familyId ?? null },
  });
  return json({ ok: true, hasCircle: Boolean(next) });
}
