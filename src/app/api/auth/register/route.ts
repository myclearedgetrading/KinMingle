import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { colorFor } from "@/lib/constants";
import { makeInviteCode, normalizeCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { error, fromZod, json, readJson, assertSameOrigin } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const parsed = registerSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const inviteCode = parsed.data.inviteCode ? normalizeCode(parsed.data.inviteCode) : "";
  const familyName = parsed.data.familyName?.trim() || "";

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          avatarColor: colorFor(email),
        },
      });

      let familyId: string;
      if (inviteCode) {
        const family = await tx.family.findUnique({ where: { inviteCode } });
        if (!family) throw new Error("BAD_INVITE");
        await tx.membership.create({
          data: { userId: created.id, familyId: family.id, role: "member" },
        });
        familyId = family.id;
      } else {
        const family = await tx.family.create({
          data: {
            name: familyName,
            inviteCode: makeInviteCode(),
            memberships: { create: { userId: created.id, role: "owner" } },
          },
        });
        familyId = family.id;
      }

      return tx.user.update({
        where: { id: created.id },
        data: { activeFamilyId: familyId },
      });
    });

    await setSessionCookie({ id: user.id, name: user.name });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "BAD_INVITE") {
      return error("That invite code doesn't match a circle.");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String(err.meta?.target || "");
      if (target.includes("email")) return error("An account with that email already exists.");
      return error("Could not finish that. Try once more.");
    }
    console.error(err);
    return error("Could not create the account.", 500);
  }
}
