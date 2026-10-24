"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { useApp } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import Link from "next/link";

type Member = {
  role: string;
  joinedAt: string;
  user: { id: string; name: string; avatarColor: string; bio: string };
};

export function FamilyPanel() {
  const { user, refreshUser } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [invite, setInvite] = useState(user.active?.family.inviteCode || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [circleName, setCircleName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!user.active) return;
    void api<{ members: Member[]; family: { inviteCode: string } }>("/api/family").then(({ ok, data }) => {
      if (!ok) return;
      setMembers(data.members);
      setInvite(data.family.inviteCode);
    });
  }, [user.active?.family.id]);

  async function copyCode() {
    await navigator.clipboard.writeText(invite);
    setNotice("Invite code copied.");
  }

  async function rotate() {
    const { ok, data } = await api<{ inviteCode: string; error?: string }>("/api/family/invite", { method: "POST" });
    if (!ok) {
      setError(errorMessage(data, "Could not change the code."));
      return;
    }
    setInvite(data.inviteCode);
    setNotice("The old code no longer works.");
    await refreshUser();
  }

  async function createCircle(event: React.FormEvent) {
    event.preventDefault();
    const { ok, data } = await api("/api/family", { method: "POST", body: JSON.stringify({ name: circleName }) });
    if (!ok) {
      setError(errorMessage(data, "Could not create that circle."));
      return;
    }
    window.location.href = "/home";
  }

  async function joinCircle(event: React.FormEvent) {
    event.preventDefault();
    const { ok, data } = await api("/api/family/join", { method: "POST", body: JSON.stringify({ inviteCode: code }) });
    if (!ok) {
      setError(errorMessage(data, "Could not join with that code."));
      return;
    }
    window.location.href = "/home";
  }

  async function switchTo(familyId: string) {
    const { ok, data } = await api("/api/family/switch", { method: "POST", body: JSON.stringify({ familyId }) });
    if (!ok) {
      setError(errorMessage(data, "Could not switch circles."));
      return;
    }
    window.location.href = "/home";
  }

  async function leave() {
    const { ok, data } = await api<{ hasCircle?: boolean; error?: string }>("/api/family/leave", { method: "POST" });
    if (!ok) {
      setError(errorMessage(data, "Could not leave."));
      return;
    }
    window.location.href = data.hasCircle ? "/home" : "/family";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-5xl">Family</h1>
        <p className="mt-2 text-muted">The people who can see this room. Share the code, and only they can come in.</p>
      </div>
      {error ? <p className="text-sm text-terra">{error}</p> : null}
      {notice ? <p className="text-sm text-pine">{notice}</p> : null}
      {user.active ? (
        <section className="rounded-[1.75rem] border border-line bg-card p-5 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{user.active.family.name}</p>
          <p className="mt-3 font-serif text-4xl tracking-[0.18em]">{invite}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyCode()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Copy code</button>
            {user.active.role === "owner" ? (
              <button type="button" onClick={() => void rotate()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">New code</button>
            ) : null}
          </div>
        </section>
      ) : null}
      {members.length > 0 ? (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.user.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <Avatar name={member.user.name} color={member.user.avatarColor} />
              <div className="min-w-0 flex-1">
                <Link href={`/people/${member.user.id}`} className="font-semibold">{member.user.name}</Link>
                <p className="truncate text-sm text-muted">{member.user.bio || `Joined ${timeAgo(member.joinedAt)}`}</p>
              </div>
              {member.role === "owner" ? <span className="text-xs uppercase tracking-[0.14em] text-terra">Owner</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {user.memberships.length > 1 ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Your circles</h2>
          {user.memberships.map((membership) => (
            <button key={membership.family.id} type="button" onClick={() => void switchTo(membership.family.id)} className="block w-full rounded-2xl border border-line bg-card px-4 py-3 text-left">
              {membership.family.name} {membership.family.id === user.active?.family.id ? "· here now" : ""}
            </button>
          ))}
        </section>
      ) : null}
      <form onSubmit={createCircle} className="rounded-[1.75rem] border border-line bg-card p-5">
        <h2 className="font-serif text-2xl">{user.active ? "Start another circle" : "Start a circle"}</h2>
        <input value={circleName} onChange={(event) => setCircleName(event.target.value)} required placeholder="Circle name" className="mt-3 w-full rounded-2xl border border-line px-4 py-3" />
        <button type="submit" className="mt-3 rounded-full bg-terra px-4 py-2 text-sm font-semibold text-white">Create</button>
      </form>
      <form onSubmit={joinCircle} className="rounded-[1.75rem] border border-line bg-card p-5">
        <h2 className="font-serif text-2xl">Join with a code</h2>
        <input value={code} onChange={(event) => setCode(event.target.value)} required placeholder="Invite code" className="mt-3 w-full rounded-2xl border border-line px-4 py-3 uppercase" />
        <button type="submit" className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-semibold">Join</button>
      </form>
      {user.active ? (
        <button type="button" onClick={() => void leave()} className="text-sm text-muted">
          {user.active.role === "owner" ? "Close this circle if you are the last person in it" : "Leave this circle"}
        </button>
      ) : null}
    </div>
  );
}
