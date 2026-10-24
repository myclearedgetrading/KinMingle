"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { SessionUser } from "@/lib/types";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

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
  composeNonce: number;
  requestCompose: () => void;
};

const AppContext = createContext<AppValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("The circle is still loading.");
  return value;
}

function NavLink({ href, label, live, badge }: { href: string; label: string; live?: boolean; badge?: number }) {
  const pathname = usePathname();
  const active = href === "/feed"
    ? pathname === "/feed" || pathname === "/home"
    : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-blush text-terra" : "text-muted hover:bg-paper hover:text-ink"}`}
    >
      <span>{label}</span>
      {live ? <span className="h-2 w-2 rounded-full bg-red-600" aria-label="Someone is live" /> : null}
      {badge ? <span className="rounded-full bg-terra px-1.5 text-xs text-white">{badge > 9 ? "9+" : badge}</span> : null}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [composeNonce, setComposeNonce] = useState(0);
  const [unread, setUnread] = useState(0);
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

  const requestCompose = useCallback(() => {
    const inCircle = pathname.startsWith("/circles/") && pathname !== "/circles";
    if (inCircle || pathname === "/feed") {
      setComposeNonce((value) => value + 1);
      return;
    }
    sessionStorage.setItem("kinmingle-compose", "1");
    router.push("/feed");
  }, [pathname, router]);

  const value = useMemo<AppValue | null>(() => {
    if (!user) return null;
    return { user, refreshUser, online, liveNow, send, subscribe, composeNonce, requestCompose };
  }, [user, refreshUser, online, liveNow, send, subscribe, composeNonce, requestCompose]);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    async function tick() {
      const { ok, data } = await api<{ unread: number }>("/api/notifications");
      if (ok && !stop) setUnread(data.unread);
    }
    void tick();
    const timer = setInterval(() => void tick(), 30000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [user, pathname]);

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
  const profileHref = `/profile/${user.id}`;
  const links = [
    { href: "/feed", label: "Home" },
    { href: "/circles", label: "Family circles" },
    { href: "/live", label: "Live", live: someoneLive },
    { href: "/notifications", label: "Notifications", badge: unread },
    { href: profileHref, label: "Profile" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <AppContext.Provider value={value}>
      <div className="mx-auto min-h-screen w-full max-w-[1440px] lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-card px-4 py-6 lg:flex">
          <div className="flex flex-col items-start gap-4 px-1">
            <Logo href="/feed" />
            <ThemeToggle />
          </div>
          <nav aria-label="KinMingle" className="mt-6 space-y-1">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} live={link.live} badge={link.badge} />
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 px-2">
            <Avatar name={user.name} color={user.avatarColor} userId={user.id} photo={user.hasAvatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              {user.admin ? <p className="text-xs uppercase tracking-[0.14em] text-terra">Admin</p> : null}
              <button type="button" onClick={() => void signOut()} className="text-xs text-muted hover:text-ink">
                Sign out
              </button>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
            <Logo href="/feed" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href={profileHref} aria-label="Your profile">
                <Avatar name={user.name} color={user.avatarColor} userId={user.id} photo={user.hasAvatar} size={36} />
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1120px] px-4 py-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8 lg:pb-10">{children}</main>
        </div>
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto grid max-w-lg grid-cols-5">
            <MobileLink href="/feed" label="Home" active={pathname === "/feed" || pathname === "/home"} />
            <MobileLink href="/circles" label="Circles" active={pathname.startsWith("/circles") || pathname.startsWith("/family")} />
            <button type="button" onClick={requestCompose} className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-terra">
              <PlusIcon />
              Create
            </button>
            <MobileLink href="/notifications" label="Alerts" active={pathname.startsWith("/notifications")} badge={unread} />
            <MobileLink href={profileHref} label="Profile" active={pathname === profileHref || pathname === "/settings"} />
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  );
}

function MobileLink({ href, label, active, badge }: { href: string; label: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${active ? "text-terra" : "text-muted"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-terra" : "bg-transparent"}`} aria-hidden />
      {label}
      {badge ? <span className="absolute right-2 top-1 rounded-full bg-terra px-1 text-[10px] text-white">{badge > 9 ? "9+" : badge}</span> : null}
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
