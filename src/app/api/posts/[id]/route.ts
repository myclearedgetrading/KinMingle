import { canModeratePost, canSeePost } from "@/lib/access";
import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { getPostForViewer } from "@/lib/feed";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { removeUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const full = new URL(req.url).searchParams.get("view") === "full";
  const post = await getPostForViewer(auth, id, full);
  if (!post) return error("That post is gone.", 404);
  return json({ post });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { media: true, liveSession: true },
  });
  if (!post || !canSeePost(auth, post)) return error("That post is gone.", 404);
  if (!canModeratePost(auth, post)) return error("You can only remove your own posts.", 403);
  if (post.liveSession?.status === "live") {
    await prisma.liveSession.update({
      where: { id: post.liveSession.id },
      data: { status: "ended", endedAt: new Date() },
    });
    await broadcast({ type: "live:ended", familyId: post.familyId, sessionId: post.liveSession.id });
  }
  await prisma.post.delete({ where: { id: post.id } });
  await Promise.all(post.media.map((item) => removeUpload(item.storageKey)));
  if (post.familyId) await broadcast({ type: "post:deleted", familyId: post.familyId, postId: post.id });
  return json({ ok: true });
}
