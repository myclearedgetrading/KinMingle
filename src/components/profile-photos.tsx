"use client";

import { useState } from "react";
import { useApp } from "@/components/shell";

export function ProfilePhotos() {
  const { user, refreshUser } = useApp();
  const [error, setError] = useState("");

  async function send(kind: "avatar" | "cover", file: File) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/users/${user.id}/${kind}`, { method: "POST", body: form });
    if (!response.ok) {
      setError("That photo didn't save. Use a JPG, PNG, WEBP, or GIF.");
      return;
    }
    setError("");
    await refreshUser();
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-3 text-sm font-semibold">
        Profile photo
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send("avatar", file);
          event.target.value = "";
        }} />
      </label>
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-3 text-sm font-semibold">
        Cover photo
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send("cover", file);
          event.target.value = "";
        }} />
      </label>
      {error ? <p className="w-full text-sm text-terra">{error}</p> : null}
    </div>
  );
}
