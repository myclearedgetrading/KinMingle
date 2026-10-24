import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CommentDTO, PostDTO } from "./types";

const authorSelect = { id: true, name: true, avatarColor: true } as const;

export const postInclude = {
  author: { select: authorSelect },
  media: { orderBy: { id: "asc" as const } },
  liveSession: {
    select: {
      id: true,
      title: true,
      status: true,
      startedAt: true,
      endedAt: true,
      hostId: true,
    },
  },
  comments: {
    orderBy: { createdAt: "desc" as const },
    take: 2,
    include: { author: { select: authorSelect } },
  },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;

function serializeComment(comment: PostRow["comments"][number]): CommentDTO {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  };
}

export function serializePost(post: PostRow): PostDTO {
  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    media: post.media.map((item) => ({
      id: item.id,
      kind: item.kind,
      mime: item.mime,
      name: item.name,
      size: item.size,
      url: `/api/media/${item.id}`,
    })),
    reactions: post.reactions,
    commentCount: post._count.comments,
    comments: [...post.comments].reverse().map(serializeComment),
    live: post.liveSession
      ? {
          id: post.liveSession.id,
          title: post.liveSession.title,
          status: post.liveSession.status,
          startedAt: post.liveSession.startedAt.toISOString(),
          endedAt: post.liveSession.endedAt?.toISOString() ?? null,
          hostId: post.liveSession.hostId,
        }
      : null,
  };
}

export async function getFeed(
  familyId: string,
  opts: { cursor?: string | null; kind?: string; q?: string; authorId?: string; take?: number },
) {
  const take = opts.take ?? 20;
  const where: Prisma.PostWhereInput = { familyId };
  if (opts.authorId) where.authorId = opts.authorId;
  if (opts.q) where.body = { contains: opts.q };
  if (opts.kind === "photo") where.media = { some: { kind: "image" } };
  if (opts.kind === "video") where.media = { some: { kind: "video" } };
  if (opts.kind === "voice") where.media = { some: { kind: "audio" } };
  if (opts.kind === "file") where.media = { some: { kind: "file" } };
  if (opts.kind === "live") where.liveSession = { isNot: null };
  if (opts.kind === "text") {
    where.media = { none: {} };
    where.liveSession = { is: null };
  }

  const rows = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: postInclude,
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    posts: page.map(serializePost),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getPost(id: string, familyId: string, full = false) {
  const post = await prisma.post.findFirst({
    where: { id, familyId },
    include: full
      ? {
          ...postInclude,
          comments: {
            orderBy: { createdAt: "desc" as const },
            take: 200,
            include: { author: { select: authorSelect } },
          },
        }
      : postInclude,
  });
  return post ? serializePost(post) : null;
}
