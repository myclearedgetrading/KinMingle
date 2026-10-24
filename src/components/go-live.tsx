"use client";

import { useState } from "react";
import { Button, Field } from "./ui";

export function GoLive() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "Could not start");
    window.location.href = `/live/${data.id}`;
  }

  return (
    <form onSubmit={start} className="rounded-3xl border border-line bg-card p-5 shadow-card">
      <h2 className="font-serif text-2xl">Go live</h2>
      <p className="mt-1 text-sm text-muted">Everyone in the circle gets a banner and can watch from their phone.</p>
      <div className="mt-4">
        <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dinner, the game, the recital" required />
      </div>
      {error ? <p className="mt-3 text-sm text-terra">{error}</p> : null}
      <Button className="mt-4" type="submit" disabled={busy}>
        {busy ? "Starting" : "Start stream"}
      </Button>
    </form>
  );
}
