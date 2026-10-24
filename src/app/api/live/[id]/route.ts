import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json, readJson } from "@/lib/http";
import { membershipFor, getAuth } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const session = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, avatarColor: true } },
      post: { include: { media: { where: { name: { startsWith: "live-recording" } }, take: 1 } } },
    },
  });
  if (!session) return error("That stream doesn't exist.", 404);
  const member = await membershipFor(auth.user.id, session.familyId);
  if (!member) return error("That stream doesn't exist.", 404);
  const recording = session.post.media[0];
  return json({
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      familyId: session.familyId,
      hostId: session.hostId,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      peakViewers: session.peakViewers,
      host: session.host,
      recordingUrl: recording ? `/api/media/${recording.id}` : null,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const body = (await readJson(req)) as { status?: string };
  if (body.status !== "ended") return error("Unsupported update.");
  const { id } = await ctx.params;
  const session = await prisma.liveSession.findUnique({ where: { id } });
  if (!session) return error("That stream doesn't exist.", 404);
  const member = await membershipFor(auth.user.id, session.familyId);
  if (!member) return error("That stream doesn't exist.", 404);
  if (session.hostId !== auth.user.id && member.role !== "owner" && !auth.user.admin) {
    return error("Only the host can end this stream.", 403);
  }
  if (session.status === "live") {
    await prisma.liveSession.update({
      where: { id },
      data: { status: "ended", endedAt: new Date() },
    });
    await broadcast({ type: "live:ended", familyId: session.familyId, sessionId: session.id });
    await broadcast({ type: "post:updated", familyId: session.familyId, postId: session.postId });
  }
  return json({ ok: true });
}
