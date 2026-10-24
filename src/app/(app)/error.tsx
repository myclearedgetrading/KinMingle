"use client";

import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-8">
      <h1 className="font-serif text-3xl">This page stumbled.</h1>
      <p className="mt-2 text-muted">Your posts are still saved. Try loading it again.</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
