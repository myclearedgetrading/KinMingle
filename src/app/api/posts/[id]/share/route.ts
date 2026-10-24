import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { postInclude, serializePost } from "@/lib/feed";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { notify } from "@/lib/notify";
import { getAuth } from "@/lib/session";
import { shareSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const parsed = shareSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);
  const { id } = await ctx.params;
  const source = await prisma.post.findUnique({ where: { id } });
  if (!source || source.visibility !== "public") return error("Only public posts can be shared.", 404);

  const post = await prisma.post.create({
    data: {
      body: parsed.data.body?.trim() || "",
      visibility: "public",
      authorId: auth.user.id,
      sharedPostId: source.id,
    },
    include: postInclude,
  });
  await notify({
    userId: source.authorId,
    actorId: auth.user.id,
    kind: "share",
    scope: "public",
    postId: source.id,
  });
  if (post.familyId) await broadcast({ type: "post:new", familyId: post.familyId, postId: post.id });
  return json({ post: serializePost(post) });
}
