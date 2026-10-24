export type AuthorDTO = {
  id: string;
  name: string;
  avatarColor: string;
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: AuthorDTO;
};

export type MediaDTO = {
  id: string;
  kind: string;
  mime: string;
  name: string;
  size: number;
  url: string;
};

export type LiveDTO = {
  id: string;
  title: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  hostId: string;
};

export type PostDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: AuthorDTO;
  media: MediaDTO[];
  reactions: Array<{ emoji: string; userId: string }>;
  commentCount: number;
  comments: CommentDTO[];
  live: LiveDTO | null;
};

export type FamilyDTO = {
  id: string;
  name: string;
  inviteCode: string;
};

export type MembershipDTO = {
  role: string;
  family: FamilyDTO;
};

export type LiveNow = {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  viewerCount: number;
};

export type ChatMessageDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: AuthorDTO;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  bio: string;
  avatarColor: string;
  admin: boolean;
  hasCircle: boolean;
  active: { role: string; family: FamilyDTO } | null;
  memberships: MembershipDTO[];
};
