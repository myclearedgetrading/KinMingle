"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Button, Field } from "./ui";

type Member = {
  role: string;
  user: { id: string; name: string; avatarColor: string; bio: string };
};

export function FamilyManager({
  family,
  role,
  members,
}: {
  family: { id: string; name: string; inviteCode: string };
  role: string;
  members: Member[];
}) {
  const [code, setCode] = useState(family.inviteCode);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [circleName, setCircleName] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  async function rotate() {
    const response = await fetch("/api/family/invite", { method: "POST" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not change the code");
    setCode(data.inviteCode);
    setError(null);
  }

  async function join(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/family/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode: invite }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not join");
    window.location.href = "/circles";
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/family", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: circleName }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not create the circle");
    window.location.href = "/family";
  }

  async function leave() {
    const response = await fetch("/api/family/leave", { method: "POST" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not leave");
    window.location.href = "/circles";
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">Circle</p>
        <h1 className="font-serif text-4xl tracking-tight">{family.name}</h1>
      </div>

      <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
        <h2 className="font-serif text-2xl">Invite</h2>
        <p className="mt-1 text-sm text-muted">Send this on WhatsApp. That&apos;s the handoff — after they join, life updates live here.</p>
        <p className="mt-4 font-serif text-4xl tracking-[0.18em]">{code}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="soft" onClick={() => void copy(code, "code")}>
            {copied === "code" ? "Copied" : "Copy code"}
          </Button>
          <Button type="button" variant="soft" onClick={() => void copy(`${window.location.origin}/join?code=${code}`, "link")}>
            {copied === "link" ? "Copied" : "Copy link"}
          </Button>
          {role === "owner" ? (
            <Button type="button" variant="ghost" onClick={() => void rotate()}>
              New code
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
        <h2 className="font-serif text-2xl">People</h2>
        <ul className="mt-3 divide-y divide-line">
          {members.map((member) => (
            <li key={member.user.id}>
              <Link href={`/profile/${member.user.id}`} className="flex items-center gap-3 py-3">
                <Avatar name={member.user.name} color={member.user.avatarColor} />
                <span>
                  <span className="block font-medium">{member.user.name}</span>
                  <span className="text-sm text-muted">{member.role === "owner" ? "Started the circle" : "Member"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form onSubmit={join} className="rounded-3xl border border-line bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">Join another</h2>
          <div className="mt-3">
            <Field label="Invite code" value={invite} onChange={(event) => setInvite(event.target.value)} />
          </div>
          <Button className="mt-3" type="submit">
            Join
          </Button>
        </form>
        <form onSubmit={create} className="rounded-3xl border border-line bg-card p-5 shadow-card">
          <h2 className="font-serif text-2xl">Start another</h2>
          <div className="mt-3">
            <Field label="Circle name" value={circleName} onChange={(event) => setCircleName(event.target.value)} placeholder="Cousins, the block, Sunday dinner" />
          </div>
          <Button className="mt-3" type="submit">
            Create
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        {confirmLeave ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">Leave {family.name}?</p>
            <Button type="button" variant="danger" onClick={() => void leave()}>
              Leave
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirmLeave(true)}>
            Leave this circle
          </Button>
        )}
        {role === "owner" ? <p className="mt-2 text-sm text-muted">If you&apos;re the last person, leaving closes the circle.</p> : null}
      </section>
      {error ? <p className="text-sm text-terra">{error}</p> : null}
    </div>
  );
}
