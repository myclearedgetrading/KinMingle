"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { useApp } from "@/components/shell";

export function SettingsForm() {
  const { user, refreshUser } = useApp();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const { ok, data } = await api("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ name, bio, currentPassword, newPassword }),
    });
    setPending(false);
    if (!ok) {
      setError(errorMessage(data, "Could not save."));
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setNotice("Saved.");
    await refreshUser();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-4">
      <h1 className="font-serif text-5xl">You</h1>
      <p className="text-muted">{user.email}</p>
      <label className="block text-sm font-medium">
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
      </label>
      <label className="block text-sm font-medium">
        Bio
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
      </label>
      <label className="block text-sm font-medium">
        Current password
        <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
      </label>
      <label className="block text-sm font-medium">
        New password
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-4 py-3" />
      </label>
      {error ? <p className="text-sm text-terra">{error}</p> : null}
      {notice ? <p className="text-sm text-pine">{notice}</p> : null}
      <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
