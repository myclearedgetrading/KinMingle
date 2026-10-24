import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json, readJson } from "@/lib/http";
import { getAuth } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { id: true, name: true, avatarColor: true, hasAvatar: true } } },
    }),
    prisma.notification.count({ where: { userId: auth.user.id, read: false } }),
  ]);
  return json({
    unread,
    notifications: notifications.map((item) => ({
      id: item.id,
      kind: item.kind,
      scope: item.scope,
      postId: item.postId,
      familyId: item.familyId,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
      actor: item.actor,
    })),
  });
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const body = await readJson(req);
  const raw = body && typeof body === "object" && "ids" in body ? body.ids : [];
  const ids = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  await prisma.notification.updateMany({
    where: { userId: auth.user.id, ...(ids.length ? { id: { in: ids } } : { read: false }) },
    data: { read: true },
  });
  return json({ ok: true });
}
