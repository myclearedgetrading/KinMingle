export type AuthorDTO = {
  id: string;
  name: string;
  avatarColor: string;
  hasAvatar?: boolean;
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
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

export type SharedPostDTO = {
  id: string;
  body: string;
  author: AuthorDTO;
};

export type PostDTO = {
  id: string;
  body: string;
  visibility: "public" | "circle";
  familyId: string | null;
  familyName: string | null;
  createdAt: string;
  author: AuthorDTO;
  media: MediaDTO[];
  reactions: Array<{ emoji: string; userId: string }>;
  commentCount: number;
  shareCount: number;
  comments: CommentDTO[];
  shared: SharedPostDTO | null;
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
  hasAvatar: boolean;
  hasCover: boolean;
  admin: boolean;
  hasCircle: boolean;
  active: { role: string; family: FamilyDTO } | null;
  memberships: MembershipDTO[];
};
