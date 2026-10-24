import { cookies } from "next/headers";
import { COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { signSession, verifySession } from "@/lib/token";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

export async function setSessionCookie(user: { id: string; name: string }) {
  const token = await signSession({ sub: user.id, name: user.name });
  const jar = await cookies();
  jar.set(COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 24 * 365 });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export function managesCircle(auth: { user: { admin: boolean }; active: { role: string } | null }) {
  return auth.user.admin || auth.active?.role === "owner";
}

export async function membershipFor(userId: string, familyId: string) {
  return prisma.membership.findUnique({
    where: { userId_familyId: { userId, familyId } },
  });
}

export async function getAuth() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      memberships: {
        include: { family: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;

  const memberships = user.memberships.map((membership) => ({
    role: membership.role,
    family: {
      id: membership.family.id,
      name: membership.family.name,
      inviteCode: membership.family.inviteCode,
    },
  }));
  let activeMembership = user.memberships.find((membership) => membership.familyId === user.activeFamilyId) ?? null;
  if (!activeMembership && user.memberships[0]) {
    activeMembership = user.memberships[0];
    await prisma.user.update({
      where: { id: user.id },
      data: { activeFamilyId: activeMembership.familyId },
    });
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarColor: user.avatarColor,
      admin: user.admin,
    },
    memberships,
    active: activeMembership
      ? {
          role: activeMembership.role,
          family: {
            id: activeMembership.family.id,
            name: activeMembership.family.name,
            inviteCode: activeMembership.family.inviteCode,
          },
        }
      : null,
  };
}
