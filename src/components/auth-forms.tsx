"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field } from "./ui";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/home";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not sign in");
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    window.location.href = safe;
  }

  return (
    <AuthFrame
      title="Welcome back."
      subtitle="The circle is right where you left it."
      footer={
        <p className="text-sm text-muted">
          New here?{" "}
          <Link href="/join" className="font-medium text-ink">
            Start or join a circle
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function JoinForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "join" || params.get("code") ? "join" : "create");
  const [me, setMe] = useState<{ name: string } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState(params.get("code") || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setMe(data.user));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const signedIn = Boolean(me);
    const endpoint = !signedIn ? "/api/auth/register" : mode === "join" ? "/api/family/join" : "/api/family";
    const payload = !signedIn
      ? { name, email, password, familyName: mode === "create" ? familyName : undefined, inviteCode: mode === "join" ? inviteCode : undefined }
      : mode === "join"
        ? { inviteCode }
        : { name: familyName };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not finish that");
    window.location.href = "/home";
  }

  return (
    <AuthFrame
      title={mode === "join" ? "Join your people." : "Open a circle."}
      subtitle={mode === "join" ? "Use the code someone sent you." : "Name it after the group. You can invite them next."}
      footer={
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-4 grid grid-cols-2 rounded-full bg-paper p-1 text-sm">
        <button type="button" className={`rounded-full py-2 ${mode === "create" ? "bg-card shadow-card" : ""}`} onClick={() => setMode("create")}>
          Start
        </button>
        <button type="button" className={`rounded-full py-2 ${mode === "join" ? "bg-card shadow-card" : ""}`} onClick={() => setMode("join")}>
          Join
        </button>
      </div>
      {me === undefined ? <p className="text-sm text-muted">Loading…</p> : null}
      {me ? <p className="mb-3 text-sm text-muted">Signed in as {me.name}. This adds another circle to your account.</p> : null}
      <form onSubmit={submit} className="space-y-4">
        {!me ? (
          <>
            <Field label="Your name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
          </>
        ) : null}
        {mode === "create" ? (
          <Field label="Circle name" value={familyName} onChange={(event) => setFamilyName(event.target.value)} placeholder="The family, the group chat, Sunday dinner" required />
        ) : (
          <Field label="Invite code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoCapitalize="characters" required />
        )}
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        <Button type="submit" disabled={busy || me === undefined} className="w-full">
          {busy ? "Working" : mode === "join" ? "Join circle" : "Create circle"}
        </Button>
      </form>
    </AuthFrame>
  );
}

function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
      <div>
        <Link href="/" className="font-serif text-3xl">
          KinMingle
        </Link>
        <h1 className="mt-6 font-serif text-5xl tracking-tight">{title}</h1>
        <p className="mt-3 max-w-sm text-lg text-muted">{subtitle}</p>
      </div>
      <div className="rounded-[28px] border border-line bg-card p-6 shadow-card">
        {children}
        <div className="mt-5">{footer}</div>
      </div>
    </main>
  );
}
