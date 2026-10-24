import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { post: true },
  });
  if (!comment) return error("That comment is gone.", 404);
  const member = auth.memberships.some((item) => item.family.id === comment.post.familyId);
  if (!member) return error("That comment is gone.", 404);
  if (comment.authorId !== auth.user.id) return error("You can only remove your own comments.", 403);
  await prisma.comment.delete({ where: { id: comment.id } });
  await broadcast({ type: "post:updated", familyId: comment.post.familyId, postId: comment.postId });
  return json({ ok: true });
}
