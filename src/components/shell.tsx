"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { SessionUser } from "@/lib/types";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";

export type RealtimeMessage = { type: string; [key: string]: unknown };

export type LiveNow = {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  viewerCount: number;
};

type AppValue = {
  user: SessionUser;
  refreshUser: () => Promise<void>;
  online: { id: string; name: string }[];
  liveNow: LiveNow[];
  send: (message: Record<string, unknown>) => void;
  subscribe: (listener: (message: RealtimeMessage) => void) => () => void;
};

const AppContext = createContext<AppValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("The circle is still loading.");
  return value;
}

const links = [
  { href: "/home", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/family", label: "Family" },
  { href: "/settings", label: "You" },
];

function NavLink({ href, label, live }: { href: string; label: string; live?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/home" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium ${active ? "bg-paper text-ink" : "text-muted hover:bg-paper/70 hover:text-ink"}`}
    >
      <span>{label}</span>
      {live ? <span className="h-2 w-2 rounded-full bg-red-600" aria-label="Someone is live" /> : null}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [online, setOnline] = useState<{ id: string; name: string }[]>([]);
  const [liveNow, setLiveNow] = useState<LiveNow[]>([]);
  const listeners = useRef(new Set<(message: RealtimeMessage) => void>());
  const sendRef = useRef<(message: Record<string, unknown>) => void>(() => undefined);

  const refreshUser = useCallback(async () => {
    const { ok, data } = await api<{ user: SessionUser | null }>("/api/auth/me");
    if (!ok || !data.user) {
      if (ok) window.location.href = "/login";
      return;
    }
    setUser(data.user);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user?.active) return;
    let socket: WebSocket | null = null;
    let stopped = false;
    let authed = false;
    const pending: Record<string, unknown>[] = [];
    let retry: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
      while (pending.length) socket.send(JSON.stringify(pending.shift()));
    };

    sendRef.current = (message) => {
      pending.push(message);
      flush();
    };

    const connect = async () => {
      const { ok, data } = await api<{ token: string; url: string }>("/api/realtime/token");
      if (!ok || stopped) return;
      socket = new WebSocket(data.url);
      socket.onopen = () => socket?.send(JSON.stringify({ type: "auth", token: data.token }));
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as RealtimeMessage;
        if (message.type === "authed") {
          authed = true;
          setOnline((message.presence as { id: string; name: string }[]) || []);
          setLiveNow((message.live as LiveNow[]) || []);
          flush();
        }
        if (message.type === "presence") setOnline((message.users as { id: string; name: string }[]) || []);
        if (message.type === "live:started") {
          const session = message.session as LiveNow;
          setLiveNow((current) => [session, ...current.filter((item) => item.id !== session.id)]);
        }
        if (message.type === "live:ended") {
          setLiveNow((current) => current.filter((item) => item.id !== message.sessionId));
        }
        if (message.type === "live:viewers") {
          setLiveNow((current) =>
            current.map((item) => (item.id === message.sessionId ? { ...item, viewerCount: Number(message.viewerCount) || 0 } : item)),
          );
        }
        listeners.current.forEach((listener) => listener(message));
      };
      socket.onclose = () => {
        authed = false;
        if (!stopped) retry = setTimeout(() => void connect(), 1500);
      };
    };

    void connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
      sendRef.current = () => undefined;
    };
  }, [user?.active?.family.id]);

  const subscribe = useCallback((listener: (message: RealtimeMessage) => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const send = useCallback((message: Record<string, unknown>) => sendRef.current(message), []);

  const value = useMemo<AppValue | null>(() => {
    if (!user) return null;
    return { user, refreshUser, online, liveNow, send, subscribe };
  }, [user, refreshUser, online, liveNow, send, subscribe]);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">Opening the room…</div>
    );
  }

  const someoneLive = liveNow.length > 0;

  return (
    <AppContext.Provider value={value}>
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-card/80 px-4 py-6 lg:flex">
          <Logo href="/home" />
          <p className="mt-6 px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            {user.active?.family.name || "No circle yet"}
          </p>
          <nav className="mt-3 space-y-1">
            {links.map((link) => (
              <NavLink key={link.href} {...link} live={link.href === "/live" && someoneLive} />
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 px-2">
            <Avatar name={user.name} color={user.avatarColor} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <button type="button" onClick={() => void signOut()} className="text-xs text-muted hover:text-ink">
                Sign out
              </button>
            </div>
          </div>
        </aside>
        <div>
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
            <Logo href="/home" />
            <Link href="/settings" aria-label="Your account">
              <Avatar name={user.name} color={user.avatarColor} size={36} />
            </Link>
          </header>
          <main className="w-full max-w-3xl px-4 py-6 pb-28 lg:max-w-6xl lg:px-8 lg:py-8">{children}</main>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-card lg:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="relative px-2 py-3 text-center text-xs font-semibold text-ink">
              {link.label}
              {link.href === "/live" && someoneLive ? <span className="absolute right-6 top-2 h-1.5 w-1.5 rounded-full bg-red-600" /> : null}
            </Link>
          ))}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
