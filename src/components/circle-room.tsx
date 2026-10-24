"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Feed } from "@/components/feed";
import { useApp } from "@/components/shell";

export function CircleRoom({ familyId }: { familyId: string }) {
  const { user, refreshUser } = useApp();
  const [ready, setReady] = useState(user.active?.family.id === familyId);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (user.active?.family.id === familyId) {
      setReady(true);
      return;
    }
    let stop = false;
    void api("/api/family/switch", { method: "POST", body: JSON.stringify({ familyId }) }).then(async ({ ok }) => {
      if (stop) return;
      if (!ok) {
        setBlocked(true);
        return;
      }
      await refreshUser();
      setReady(true);
    });
    return () => {
      stop = true;
    };
  }, [familyId, refreshUser, user.active?.family.id]);

  if (blocked) return <p className="text-sm text-muted">You aren’t in this circle.</p>;
  if (!ready) return <p className="text-sm text-muted">Opening the circle…</p>;
  return <Feed />;
}
