import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { commentSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("Sign in first.", 401);
  const parsed = commentSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id } = await ctx.params;
  const post = await prisma.post.findFirst({ where: { id, familyId: auth.active.family.id } });
  if (!post) return error("That post is gone.", 404);

  const comment = await prisma.comment.create({
    data: { body: parsed.data.body, postId: post.id, authorId: auth.user.id },
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
  });
  const commentCount = await prisma.comment.count({ where: { postId: post.id } });
  await broadcast({ type: "post:updated", familyId: post.familyId, postId: post.id });
  return json({
    comment: {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    },
    commentCount,
  });
}
