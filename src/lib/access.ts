type Viewer = {
  user: { id: string; admin: boolean };
  memberships: Array<{ role: string; family: { id: string } }>;
};

export function isMember(viewer: Viewer, familyId: string | null | undefined) {
  if (!familyId) return false;
  return viewer.memberships.some((item) => item.family.id === familyId);
}

export function canSeePost(viewer: Viewer, post: { visibility: string; familyId: string | null }) {
  if (post.visibility === "public") return true;
  return post.visibility === "circle" && isMember(viewer, post.familyId);
}

export function canModeratePost(viewer: Viewer, post: { visibility: string; familyId: string | null; authorId: string }) {
  if (post.authorId === viewer.user.id || viewer.user.admin) return true;
  if (post.visibility !== "circle" || !post.familyId) return false;
  return viewer.memberships.some((item) => item.family.id === post.familyId && item.role === "owner");
}
