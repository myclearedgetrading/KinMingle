import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validators";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; at: number }>();

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const now = Date.now();
  const prior = attempts.get(email);
  if (prior && now - prior.at < 15 * 60 * 1000 && prior.count >= 8) {
    return error("Too many tries. Wait a few minutes and try again.", 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const match = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !match) {
    const current = prior && now - prior.at < 15 * 60 * 1000 ? prior.count : 0;
    attempts.set(email, { count: current + 1, at: now });
    return error("Email or password is wrong.", 401);
  }

  attempts.delete(email);
  await setSessionCookie({ id: user.id, name: user.name });
  return json({ ok: true });
}
