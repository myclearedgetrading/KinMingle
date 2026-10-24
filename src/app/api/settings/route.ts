import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { settingsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = settingsSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const nextPassword = parsed.data.newPassword?.trim() || "";
  if (nextPassword) {
    if (nextPassword.length < 8) return error("Use at least 8 characters.");
    if (nextPassword.length > 72) return error("Use 72 characters or fewer.");
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return error("Sign in first.", 401);
    const match = await bcrypt.compare(parsed.data.currentPassword || "", user.passwordHash);
    if (!match) return error("Current password is wrong.");
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, bio: parsed.data.bio, passwordHash: await bcrypt.hash(nextPassword, 12) },
    });
  } else {
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { name: parsed.data.name, bio: parsed.data.bio },
    });
  }

  return json({ ok: true });
}
