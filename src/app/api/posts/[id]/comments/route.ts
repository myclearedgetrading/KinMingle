import { canSeePost } from "@/lib/access";
import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { notify } from "@/lib/notify";
import { getAuth } from "@/lib/session";
import { commentSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = commentSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || !canSeePost(auth, post)) return error("That post is gone.", 404);

  let parentAuthorId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parsed.data.parentId, postId: post.id } });
    if (!parent) return error("That comment is gone.", 404);
    parentAuthorId = parent.authorId;
  }

  const comment = await prisma.comment.create({
    data: {
      body: parsed.data.body,
      postId: post.id,
      authorId: auth.user.id,
      parentId: parsed.data.parentId || null,
    },
    include: { author: { select: { id: true, name: true, avatarColor: true, hasAvatar: true } } },
  });
  const commentCount = await prisma.comment.count({ where: { postId: post.id } });
  const scope = post.visibility === "public" ? "public" : "circle";
  await notify({
    userId: parentAuthorId || post.authorId,
    actorId: auth.user.id,
    kind: parentAuthorId ? "reply" : "comment",
    scope,
    postId: post.id,
    familyId: post.familyId,
  });
  if (parentAuthorId && parentAuthorId !== post.authorId) {
    await notify({
      userId: post.authorId,
      actorId: auth.user.id,
      kind: "comment",
      scope,
      postId: post.id,
      familyId: post.familyId,
    });
  }
  if (post.familyId) await broadcast({ type: "post:updated", familyId: post.familyId, postId: post.id });
  return json({
    comment: {
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    },
    commentCount,
  });
}
