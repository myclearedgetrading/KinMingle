import { notFound, redirect } from "next/navigation";
import { CircleRoom } from "@/components/circle-room";
import { getAuth } from "@/lib/session";

export const metadata = { title: "Family circle" };

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const { id } = await params;
  const member = auth.memberships.some((item) => item.family.id === id);
  if (!member) notFound();
  return <CircleRoom familyId={id} />;
}
