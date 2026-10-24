"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, errorMessage } from "@/lib/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { ok, data } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setPending(false);
    if (!ok) {
      setError(errorMessage(data, "Could not sign in."));
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    window.location.href = dest;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <ThemeToggle />
      </div>
      <h1 className="mt-8 font-serif text-5xl text-ink">Welcome back.</h1>
      <p className="mt-3 text-muted">Sign in to the circle you already belong to.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" autoComplete="email" required className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
        </label>
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        <button type="submit" disabled={pending} className="w-full rounded-full bg-terra py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Link href="/" className="mt-3 block w-full rounded-full border border-line bg-card py-3 text-center text-sm font-semibold text-ink">
        Back home
      </Link>
      <p className="mt-8 text-sm text-muted">
        New here? <Link href="/join" className="font-semibold text-ink underline decoration-line underline-offset-4">Start or join a circle</Link>
      </p>
    </main>
  );
}
