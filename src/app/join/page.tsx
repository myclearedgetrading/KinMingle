"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, errorMessage } from "@/lib/client";

export default function JoinPage() {
  const [mode, setMode] = useState<"start" | "join">("start");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "join") setMode("join");
  }, []);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { ok, data } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        familyName: mode === "start" ? form.get("familyName") : "",
        inviteCode: mode === "join" ? form.get("inviteCode") : "",
      }),
    });
    setPending(false);
    if (!ok) {
      setError(errorMessage(data, "Could not create the account."));
      return;
    }
    window.location.href = "/home";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <ThemeToggle />
      </div>
      <h1 className="mt-8 font-serif text-5xl text-ink">{mode === "start" ? "Start the circle." : "Join the circle."}</h1>
      <p className="mt-3 text-muted">
        {mode === "start" ? "You will get an invite code to share with family and close friends." : "Use the code someone in the family sent you."}
      </p>
      <div className="mt-6 grid grid-cols-2 rounded-full bg-line/40 p-1">
        {(["start", "join"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-full py-2 text-sm font-semibold ${mode === item ? "bg-card text-ink shadow-card" : "text-muted"}`}
          >
            {item === "start" ? "Start" : "Join"}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Your name
          <input name="name" required autoComplete="name" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
        </label>
        {mode === "start" ? (
          <label className="block text-sm font-medium">
            Circle name
            <input name="familyName" required placeholder="The Hart family" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
          </label>
        ) : (
          <label className="block text-sm font-medium">
            Invite code
            <input name="inviteCode" required autoCapitalize="characters" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3 uppercase tracking-[0.2em]" />
          </label>
        )}
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        <button type="submit" disabled={pending} className="w-full rounded-full bg-terra py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : mode === "start" ? "Create the circle" : "Join"}
        </button>
      </form>
      <p className="mt-8 text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-ink underline decoration-line underline-offset-4">Sign in</Link>
      </p>
    </main>
  );
}
