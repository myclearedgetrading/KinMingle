"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { useApp } from "@/components/shell";

type Session = {
  id: string;
  title: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  host: { id: string; name: string; avatarColor: string };
};

export function LiveLobby() {
  const { user, liveNow } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [secure, setSecure] = useState(true);

  useEffect(() => setSecure(window.isSecureContext), []);

  useEffect(() => {
    if (!user.hasCircle) return;
    void api<{ sessions: Session[] }>("/api/live").then(({ ok, data }) => {
      if (ok) setSessions(data.sessions);
    });
  }, [user.hasCircle, liveNow.length]);

  async function goLive(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const { ok, data } = await api<{ id?: string; error?: string }>("/api/live", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    setPending(false);
    if (!ok || !data.id) {
      setError(errorMessage(data, "Could not start the live."));
      return;
    }
    window.location.href = `/live/${data.id}`;
  }

  if (!user.hasCircle) {
    return <p className="text-muted">Join a circle before going live. <Link href="/family" className="font-semibold text-ink">Open family</Link></p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-5xl">Live</h1>
        <p className="mt-2 text-muted">Start a live for the circle. Anyone who joins can turn on a camera, talk, or share a screen.</p>
      </div>
      {!secure ? (
        <p className="rounded-2xl bg-[#f8e7e1] px-4 py-3 text-sm text-terra">
          The camera is blocked on this address. On this computer, open KinMingle at localhost. Phones need HTTPS before they can broadcast.
        </p>
      ) : null}
      <form onSubmit={goLive} className="rounded-[1.75rem] border border-line bg-card p-5 shadow-card">
        <label className="block text-sm font-medium">
          What are we watching?
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} placeholder="Sunday lunch, the recital, a walk" className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3" />
        </label>
        {error ? <p className="mt-3 text-sm text-terra">{error}</p> : null}
        <button type="submit" disabled={pending || !secure} className="mt-4 rounded-full bg-terra px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Starting…" : "Go live"}
        </button>
      </form>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link href={`/live/${session.id}`} className="flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
              <span>
                <span className="block font-semibold">{session.title}</span>
                <span className="text-sm text-muted">{session.host.name} · {session.status === "live" ? "Live now" : `Ended ${timeAgo(session.endedAt || session.startedAt)}`}</span>
              </span>
              <span className="text-sm font-semibold">{session.status === "live" ? "Join" : "Replay chat"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
