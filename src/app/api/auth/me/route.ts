import { COOKIE } from "@/lib/constants";
import { json } from "@/lib/http";
import { getAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth) {
    const response = json({ user: null });
    response.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }
  return json({
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      bio: auth.user.bio,
      avatarColor: auth.user.avatarColor,
      hasAvatar: auth.user.hasAvatar,
      hasCover: auth.user.hasCover,
      admin: auth.user.admin,
      hasCircle: Boolean(auth.active),
      active: auth.active,
      memberships: auth.memberships,
    },
  });
}
