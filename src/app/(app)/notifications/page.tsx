"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/avatar";

type Notice = {
  id: string;
  kind: string;
  scope: string;
  postId: string | null;
  familyId: string | null;
  read: boolean;
  createdAt: string;
  actor: { id: string; name: string; avatarColor: string; hasAvatar: boolean };
};

const copy: Record<string, string> = {
  reaction: "reacted to your post",
  comment: "commented on your post",
  reply: "replied to your comment",
  share: "shared your post",
  "circle-post": "posted in your circle",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api<{ notifications: Notice[] }>("/api/notifications").then(async ({ ok, data }) => {
      setLoading(false);
      if (!ok) return;
      setItems(data.notifications);
      await api("/api/notifications", { method: "POST", body: JSON.stringify({}) });
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-serif text-5xl">Notifications</h1>
        <p className="mt-2 text-muted">Public reactions stay here, and circle activity stays with the people in that circle.</p>
      </div>
      {loading ? <p className="text-sm text-muted">Loading</p> : null}
      {!loading && items.length === 0 ? (
        <p className="rounded-[1.75rem] border border-line bg-card p-6 text-muted">Nothing new yet. When someone reacts, comments, or posts in your circle, it shows up here.</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const href = item.scope === "circle" && item.familyId ? `/circles/${item.familyId}` : item.postId ? `/post/${item.postId}` : "/feed";
          return (
            <li key={item.id}>
              <Link href={href} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
                <Avatar name={item.actor.name} color={item.actor.avatarColor} userId={item.actor.id} photo={item.actor.hasAvatar} />
                <p className="min-w-0 flex-1">
                  <span className="font-semibold">{item.actor.name}</span> {copy[item.kind] || "updated KinMingle"}
                  <span className="mt-0.5 block text-xs text-muted">{item.scope === "circle" ? "Family circle" : "Public"} · {timeAgo(item.createdAt)}</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
