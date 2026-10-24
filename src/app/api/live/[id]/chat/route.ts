import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { membershipFor, getAuth } from "@/lib/session";
import { chatSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadSession(id: string, userId: string) {
  const session = await prisma.liveSession.findUnique({ where: { id } });
  if (!session) return null;
  const member = await membershipFor(userId, session.familyId);
  if (!member) return null;
  return session;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const session = await loadSession(id, auth.user.id);
  if (!session) return error("That stream doesn't exist.", 404);
  const messages = await prisma.liveMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
  });
  return json({
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      author: message.author,
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = chatSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id } = await ctx.params;
  const session = await loadSession(id, auth.user.id);
  if (!session) return error("That stream doesn't exist.", 404);
  if (session.status !== "live") return error("The stream has ended.");

  const message = await prisma.liveMessage.create({
    data: { body: parsed.data.body, sessionId: session.id, authorId: auth.user.id },
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
  });
  const dto = {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
  };
  await broadcast({ type: "chat:new", familyId: session.familyId, sessionId: session.id, message: dto });
  return json({ message: dto });
}
