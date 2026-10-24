import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ProfileFeed } from "@/components/profile-feed";
import { Avatar } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getFeed } from "@/lib/feed";
import { getAuth } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth?.active) redirect("/login");
  const { id } = await params;
  const member = await prisma.membership.findUnique({
    where: { userId_familyId: { userId: id, familyId: auth.active.family.id } },
    include: { user: true },
  });
  if (!member) notFound();
  const feed = await getFeed(auth.active.family.id, { authorId: id });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
        <div className="flex items-center gap-4">
          <Avatar name={member.user.name} color={member.user.avatarColor} size={64} />
          <div>
            <h1 className="font-serif text-4xl tracking-tight">{member.user.name}</h1>
            <p className="text-sm text-muted">{member.role === "owner" ? "Started this circle" : "In the circle"}</p>
          </div>
        </div>
        {member.user.bio ? <p className="mt-4 whitespace-pre-wrap leading-relaxed">{member.user.bio}</p> : null}
        {member.user.id === auth.user.id ? (
          <Link href="/settings" className="mt-4 inline-block text-sm font-medium text-pine">
            Edit profile
          </Link>
        ) : null}
      </section>
      <ProfileFeed initialPosts={feed.posts} />
    </div>
  );
}
