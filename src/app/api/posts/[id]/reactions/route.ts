import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { reactionSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("Sign in first.", 401);
  const parsed = reactionSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id } = await ctx.params;
  const post = await prisma.post.findFirst({ where: { id, familyId: auth.active.family.id } });
  if (!post) return error("That post is gone.", 404);

  const existing = await prisma.reaction.findUnique({
    where: { postId_userId_emoji: { postId: post.id, userId: auth.user.id, emoji: parsed.data.emoji } },
  });
  if (existing) await prisma.reaction.delete({ where: { id: existing.id } });
  else await prisma.reaction.create({ data: { postId: post.id, userId: auth.user.id, emoji: parsed.data.emoji } });

  const reactions = await prisma.reaction.findMany({
    where: { postId: post.id },
    select: { emoji: true, userId: true },
  });
  await broadcast({ type: "post:updated", familyId: post.familyId, postId: post.id });
  return json({ reactions });
}
