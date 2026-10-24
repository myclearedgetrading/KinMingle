import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ProfileFeed } from "@/components/profile-feed";
import { ProfilePhotos } from "@/components/profile-photos";
import { Avatar } from "@/components/avatar";
import { prisma } from "@/lib/db";
import { getPublicFeed } from "@/lib/feed";
import { getAuth } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const { id } = await params;
  const person = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, bio: true, avatarColor: true, hasAvatar: true, hasCover: true, createdAt: true },
  });
  if (!person) notFound();
  const feed = await getPublicFeed({ authorId: id });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="overflow-hidden rounded-3xl border border-line bg-card shadow-card">
        <div className="relative h-40 bg-blush sm:h-52">
          {person.hasCover ? <img src={`/api/users/${person.id}/cover`} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-8 flex items-end gap-4">
            <span className="rounded-full ring-4 ring-card">
              <Avatar name={person.name} color={person.avatarColor} size={72} userId={person.id} photo={person.hasAvatar} />
            </span>
            <div>
              <h1 className="font-serif text-4xl tracking-tight">{person.name}</h1>
              <p className="text-sm text-muted">Joined {person.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
          {person.bio ? <p className="mt-4 whitespace-pre-wrap leading-relaxed">{person.bio}</p> : <p className="mt-4 text-muted">No bio yet.</p>}
          <p className="mt-3 text-sm text-muted">Public posts only. Family circle updates stay inside the circle.</p>
          {person.id === auth.user.id ? (
            <div className="mt-4 space-y-3">
              <ProfilePhotos />
              <Link href="/settings" className="inline-block text-sm font-medium text-pine">Edit profile</Link>
            </div>
          ) : null}
        </div>
      </section>
      <ProfileFeed initialPosts={feed.posts} />
    </div>
  );
}
