import { notFound, redirect } from "next/navigation";
import { PostDetail } from "@/components/post-card";
import { getPost } from "@/lib/feed";
import { getAuth } from "@/lib/session";

export const metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth?.active) redirect("/login");
  const { id } = await params;
  const post = await getPost(id, auth.active.family.id, true);
  if (!post) notFound();
  return <PostDetail initial={post} />;
}
