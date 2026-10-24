import { prisma } from "@/lib/db";

type Notice = {
  userId: string;
  actorId: string;
  kind: string;
  scope: "public" | "circle";
  postId?: string | null;
  familyId?: string | null;
};

export async function notify(notice: Notice) {
  if (!notice.userId || notice.userId === notice.actorId) return;
  await prisma.notification.create({
    data: {
      userId: notice.userId,
      actorId: notice.actorId,
      kind: notice.kind,
      scope: notice.scope,
      postId: notice.postId || null,
      familyId: notice.familyId || null,
    },
  });
}

export async function notifyCircle(familyId: string, actorId: string, kind: string, postId: string) {
  const members = await prisma.membership.findMany({
    where: { familyId, userId: { not: actorId } },
    select: { userId: true },
  });
  if (members.length === 0) return;
  await prisma.notification.createMany({
    data: members.map((member) => ({
      userId: member.userId,
      actorId,
      kind,
      scope: "circle",
      postId,
      familyId,
    })),
  });
}
