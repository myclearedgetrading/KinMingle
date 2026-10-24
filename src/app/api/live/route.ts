import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { postInclude } from "@/lib/feed";
import { assertSameOrigin, error, fromZod, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { liveSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth?.active) return error("Sign in first.", 401);
  const sessions = await prisma.liveSession.findMany({
    where: { familyId: auth.active.family.id },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      host: { select: { id: true, name: true, avatarColor: true } },
      post: { include: { media: { where: { name: { startsWith: "live-recording" } }, select: { id: true } } } },
    },
  });
  return json({
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      peakViewers: session.peakViewers,
      host: session.host,
      hasRecording: session.post.media.length > 0,
    })),
  });
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("Join a circle first.", 401);
  const parsed = liveSchema.safeParse(await readJson(req));
  if (!parsed.success) return fromZod(parsed.error);

  const existing = await prisma.liveSession.findFirst({
    where: { hostId: auth.user.id, status: "live", familyId: auth.active.family.id },
  });
  if (existing) return json({ id: existing.id, existing: true });

  const post = await prisma.post.create({
    data: {
      body: parsed.data.title,
      authorId: auth.user.id,
      familyId: auth.active.family.id,
      liveSession: {
        create: {
          title: parsed.data.title,
          hostId: auth.user.id,
          familyId: auth.active.family.id,
          status: "live",
        },
      },
    },
    include: postInclude,
  });

  await broadcast({ type: "post:new", familyId: auth.active.family.id, postId: post.id });
  await broadcast({
    type: "live:started",
    familyId: auth.active.family.id,
    session: {
      id: post.liveSession!.id,
      title: parsed.data.title,
      hostId: auth.user.id,
      hostName: auth.user.name,
      viewerCount: 0,
    },
  });
  return json({ id: post.liveSession!.id });
}
