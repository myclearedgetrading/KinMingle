"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { Feed } from "@/components/feed";
import { Avatar } from "@/components/avatar";

type Member = { role: string; user: { id: string; name: string; avatarColor: string; bio: string } };

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    void api<{ members: Member[] }>("/api/family").then(({ ok, data }) => {
      if (!ok) return;
      setMember(data.members.find((item) => item.user.id === params.id) || null);
    });
  }, [params.id]);

  return (
    <div className="space-y-6">
      {member ? (
        <header className="flex items-center gap-4">
          <Avatar name={member.user.name} color={member.user.avatarColor} size={64} />
          <div>
            <h1 className="font-serif text-4xl">{member.user.name}</h1>
            <p className="text-muted">{member.user.bio || "No bio yet."}</p>
          </div>
        </header>
      ) : (
        <h1 className="font-serif text-4xl">Their updates</h1>
      )}
      <Feed authorId={params.id} showComposer={false} />
    </div>
  );
}
