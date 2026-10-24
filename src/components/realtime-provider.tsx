"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LiveNow } from "@/lib/types";

type Handler = (message: Record<string, unknown>) => void;

type RealtimeValue = {
  status: "connecting" | "online" | "offline";
  presence: { id: string; name: string }[];
  liveNow: LiveNow[];
  subscribe: (handler: Handler) => () => void;
};

const RealtimeContext = createContext<RealtimeValue | null>(null);

export function useRealtime() {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error("Realtime is only available inside the circle");
  return value;
}

export function RealtimeProvider({
  familyId,
  initialLive,
  children,
}: {
  familyId: string;
  initialLive: LiveNow[];
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<RealtimeValue["status"]>("connecting");
  const [presence, setPresence] = useState<{ id: string; name: string }[]>([]);
  const [liveNow, setLiveNow] = useState<LiveNow[]>(initialLive);
  const handlers = useRef(new Set<Handler>());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;

    async function connect() {
      try {
        const response = await fetch(`/api/realtime/token?familyId=${familyId}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "token");
        if (stopped) return;
        ws = new WebSocket(payload.url);
        ws.onopen = () => ws?.send(JSON.stringify({ type: "auth", token: payload.token }));
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data) as Record<string, unknown>;
          if (message.type === "authed") {
            setStatus("online");
            setPresence((message.presence as { id: string; name: string }[]) || []);
            setLiveNow((message.live as LiveNow[]) || []);
            attempt = 0;
          } else if (message.type === "presence") {
            setPresence((message.users as { id: string; name: string }[]) || []);
          } else if (message.type === "live:started") {
            const session = message.session as LiveNow;
            setLiveNow((current) => (current.some((item) => item.id === session.id) ? current : [session, ...current]));
          } else if (message.type === "live:ended") {
            setLiveNow((current) => current.filter((item) => item.id !== message.sessionId));
          } else if (message.type === "live:viewers") {
            setLiveNow((current) =>
              current.map((item) => (item.id === message.sessionId ? { ...item, viewerCount: Number(message.viewerCount) || 0 } : item)),
            );
          }
          if (message.type !== "pong") handlers.current.forEach((handler) => handler(message));
        };
        ws.onclose = () => {
          setStatus("offline");
          clearInterval(ping);
          if (stopped) return;
          const wait = Math.min(10_000, 1000 * 2 ** attempt);
          attempt += 1;
          timer = setTimeout(connect, wait);
        };
        ping = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 25_000);
      } catch {
        setStatus("offline");
        if (!stopped) timer = setTimeout(connect, 3000);
      }
    }

    void connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(ping);
      ws?.close();
    };
  }, [familyId]);

  const subscribe = useCallback((handler: Handler) => {
    handlers.current.add(handler);
    return () => handlers.current.delete(handler);
  }, []);

  const value = useMemo(() => ({ status, presence, liveNow, subscribe }), [status, presence, liveNow, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
