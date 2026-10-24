import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CommentDTO, PostDTO } from "./types";

const authorSelect = { id: true, name: true, avatarColor: true, hasAvatar: true } as const;

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
  family: { select: { id: true, name: true } },
  sharedPost: {
    select: {
      id: true,
      body: true,
      visibility: true,
      author: { select: authorSelect },
    },
  },
  comments: {
    where: { parentId: null },
    orderBy: { createdAt: "desc" as const },
    take: 2,
    include: { author: { select: authorSelect } },
  },
  reactions: { select: { emoji: true, userId: true } },
  _count: { select: { comments: true, shares: true } },
} satisfies Prisma.PostInclude;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;

function serializeComment(comment: { id: string; body: string; createdAt: Date; parentId: string | null; author: PostRow["author"] }): CommentDTO {
  return {
    id: comment.id,
    body: comment.body,
    parentId: comment.parentId,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  };
}

export function serializePost(post: PostRow): PostDTO {
  const shared = post.sharedPost && post.sharedPost.visibility === "public"
    ? { id: post.sharedPost.id, body: post.sharedPost.body, author: post.sharedPost.author }
    : null;
  return {
    id: post.id,
    body: post.body,
    visibility: post.visibility === "public" ? "public" : "circle",
    familyId: post.familyId,
    familyName: post.family?.name ?? null,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    shareCount: post._count.shares,
    shared,
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
  const where: Prisma.PostWhereInput = { familyId, visibility: "circle" };
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

function feedWhere(opts: { kind?: string; q?: string; authorId?: string }, where: Prisma.PostWhereInput) {
  if (opts.authorId) where.authorId = opts.authorId;
  if (opts.q) where.body = { contains: opts.q, mode: "insensitive" };
  if (opts.kind === "photo") where.media = { some: { kind: "image" } };
  if (opts.kind === "video") where.media = { some: { kind: "video" } };
  if (opts.kind === "voice") where.media = { some: { kind: "audio" } };
  if (opts.kind === "file") where.media = { some: { kind: "file" } };
  if (opts.kind === "live") where.liveSession = { isNot: null };
  if (opts.kind === "text") {
    where.media = { none: {} };
    where.liveSession = { is: null };
  }
}

export async function getPublicFeed(opts: { cursor?: string | null; kind?: string; q?: string; authorId?: string; take?: number }) {
  const take = opts.take ?? 20;
  const where: Prisma.PostWhereInput = { visibility: "public" };
  feedWhere(opts, where);
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

export async function getPostForViewer(
  viewer: { memberships: Array<{ family: { id: string } }> },
  id: string,
  full = false,
) {
  const post = await prisma.post.findUnique({
    where: { id },
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
  if (!post) return null;
  const allowed = post.visibility === "public" || viewer.memberships.some((item) => item.family.id === post.familyId);
  if (!allowed) return null;
  return serializePost(post);
}
