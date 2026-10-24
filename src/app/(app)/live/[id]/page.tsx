import { LiveRoom } from "@/components/live-room";

export const metadata = { title: "Live room" };

export default async function LiveRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveRoom sessionId={id} />;
}
