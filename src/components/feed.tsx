"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/client";
import type { PostDTO } from "@/lib/types";
import { ACCEPT } from "@/components/accept";
import { Avatar } from "@/components/avatar";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { useApp } from "@/components/shell";

const filters = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Videos" },
  { id: "voice", label: "Voice" },
  { id: "file", label: "Files" },
  { id: "live", label: "Live" },
];

type Member = {
  role: string;
  user: { id: string; name: string; avatarColor: string };
};

export function Feed({ authorId, showComposer = true }: { authorId?: string; showComposer?: boolean }) {
  const { user, liveNow, online, subscribe, composeNonce, requestCompose } = useApp();
  const home = showComposer && !authorId;
  const manages = user.admin || user.active?.role === "owner";
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [hasCover, setHasCover] = useState(false);
  const [coverVersion, setCoverVersion] = useState(0);
  const [peopleError, setPeopleError] = useState("");
  const [openSignal, setOpenSignal] = useState(0);

  async function load(reset: boolean, nextCursor?: string | null) {
    if (!user.hasCircle) {
      setLoading(false);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      setError("");
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    if (query.trim()) params.set("q", query.trim());
    if (authorId) params.set("authorId", authorId);
    if (!reset && nextCursor) params.set("cursor", nextCursor);
    try {
      const { ok, data } = await api<{ posts: PostDTO[]; nextCursor: string | null; error?: string }>(`/api/posts?${params}`);
      setLoading(false);
      if (!ok) {
        setError(errorMessage(data, "Could not load the room."));
        return;
      }
      setOffline(false);
      setError("");
      setCursor(data.nextCursor);
      setPosts((current) => (reset ? data.posts : [...current, ...data.posts]));
    } catch {
      setLoading(false);
      if (typeof navigator !== "undefined" && !navigator.onLine) setOffline(true);
      else setError("Could not load the room.");
    }
  }

  async function loadPeople() {
    const { ok, data } = await api<{ members: Member[]; hasCover: boolean }>("/api/family");
    if (!ok) {
      setPeopleError("Couldn't load your people.");
      return;
    }
    setPeopleError("");
    setMembers(data.members);
    setHasCover(data.hasCover);
  }

  useEffect(() => {
    if (!home) return;
    void loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, user.active?.family.id]);

  useEffect(() => {
    setLoading(true);
    setError("");
    setOffline(false);
    const handle = setTimeout(() => void load(true), query ? 250 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, query, authorId, user.active?.family.id]);

  useEffect(() => {
    return subscribe((message) => {
      if (!user.active) return;
      if (message.type === "post:deleted") {
        setPosts((current) => current.filter((post) => post.id !== message.postId));
        return;
      }
      if (message.type !== "post:new" && message.type !== "post:updated") return;
      const postId = String(message.postId || "");
      if (!postId) return;
      void api<{ post: PostDTO }>(`/api/posts/${postId}`).then(({ ok, data }) => {
        if (!ok) return;
        if (authorId && data.post.author.id !== authorId) return;
        setPosts((current) => {
          const index = current.findIndex((post) => post.id === data.post.id);
          if (index === -1) return message.type === "post:new" ? [data.post, ...current] : current;
          const next = current.slice();
          next[index] = data.post;
          return next;
        });
      });
    });
  }, [subscribe, authorId, user.active]);

  useEffect(() => {
    if (!home) return;
    if (sessionStorage.getItem("kinmingle-compose") === "1") {
      sessionStorage.removeItem("kinmingle-compose");
      setOpenSignal((value) => value + 1);
    }
  }, [home]);

  useEffect(() => {
    if (!home || !composeNonce) return;
    setOpenSignal((value) => value + 1);
  }, [composeNonce, home]);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!user.hasCircle) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-8 shadow-card">
        <h1 className="font-serif text-4xl">Start with the people who belong here.</h1>
        <p className="mt-3 text-base text-muted">Create a circle for your family, or join one with the invite code they sent you.</p>
        <div className="mt-6">
          <Link href="/family" className="inline-flex min-h-11 items-center rounded-xl bg-terra px-4 text-sm font-semibold text-white">Open family</Link>
        </div>
      </section>
    );
  }

  const filtered = kind !== "all" || query.trim().length > 0;
  const live = liveNow[0];

  return (
    <div className={home ? "mx-auto grid w-full max-w-[760px] gap-6 min-[1440px]:max-w-[1100px] min-[1440px]:grid-cols-[minmax(0,760px)_300px] min-[1440px]:items-start min-[1440px]:gap-8" : "space-y-5"}>
        <div className="min-w-0 space-y-6">
          {home ? (
            <header className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate font-serif text-4xl text-ink sm:text-5xl">Hey {user.name} 👋</h1>
                <p className="mt-1 text-base text-muted">What’s happening with your people?</p>
              </div>
              <Link href={`/profile/${user.id}`} aria-label="Your profile" className="shrink-0">
                <Avatar name={user.name} color={user.avatarColor} size={48} />
              </Link>
            </header>
          ) : null}
          {home ? (
            <CircleBanner
              name={user.active?.family.name || "Your circle"}
              count={members.length}
              hasCover={hasCover}
              coverVersion={coverVersion}
              manages={manages}
              onCover={() => {
                setHasCover(true);
                setCoverVersion(Date.now());
              }}
            />
          ) : null}
          {home && showComposer ? (
            <Composer
              destination="circle"
              familyId={user.active?.family.id}
              openSignal={openSignal}
              onPosted={(post) => {
                if (post.visibility !== "circle" || post.familyId !== user.active?.family.id) return;
                setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
              }}
            />
          ) : null}

          {home ? (
            <section aria-labelledby="your-people">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="your-people" className="font-serif text-2xl text-ink">Your people</h2>
                <Link href="/family" className="text-sm font-semibold text-terra">View family</Link>
              </div>
              {peopleError ? (
                <p className="mt-3 text-sm text-muted">
                  {peopleError}{" "}
                  <button type="button" onClick={() => void loadPeople()} className="font-semibold text-terra">Try again</button>
                </p>
              ) : (
                <ul className="mt-4 flex gap-4 overflow-x-auto pb-1">
                  {members.map((member) => {
                    const active = online.some((person) => person.id === member.user.id);
                    return (
                      <li key={member.user.id} className="w-16 shrink-0 text-center">
                        <Link href={`/profile/${member.user.id}`} className="block">
                          <span className="relative inline-block">
                            <Avatar name={member.user.name} color={member.user.avatarColor} size={56} />
                            {active ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-terra" aria-label="Active now" /> : null}
                          </span>
                          <span className="mt-1 block truncate text-xs font-medium text-ink">{member.user.name}</span>
                          {active ? <span className="sr-only">Active now</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          <section aria-labelledby={home ? "family-updates" : undefined} className="space-y-4">
            {home ? <h2 id="family-updates" className="font-serif text-2xl text-ink">Family updates</h2> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Filter updates">
                {filters.map((filter) => {
                  const selected = kind === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setKind(filter.id)}
                      className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${selected ? "border-terra text-terra" : "border-transparent text-muted"}`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <label className="sm:ml-auto sm:w-52">
                <span className="sr-only">Search updates</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search updates"
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-base"
                />
              </label>
            </div>

            {offline ? (
              <StatusCard
                title="You’re offline"
                body="KinMingle will load updates when this device is back online."
                action="Try again"
                onAction={() => void load(true)}
              />
            ) : null}
            {!offline && error ? (
              <StatusCard title="Updates didn’t load" body={error} action="Try again" onAction={() => void load(true)} />
            ) : null}
            {loading && posts.length === 0 ? <FeedSkeleton /> : null}
            {!loading && !error && !offline && posts.length === 0 ? (
              filtered ? (
                <StatusCard
                  title="Nothing matches"
                  body="Try another filter, or clear the search."
                  action="Show everything"
                  onAction={() => { setKind("all"); setQuery(""); }}
                />
              ) : authorId ? (
                <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">Nothing from them yet.</p>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
                  <EmptyMark />
                  <h3 className="mt-4 font-serif text-3xl text-ink">Your family’s story starts here.</h3>
                  <p className="mx-auto mt-2 max-w-sm text-base text-muted">Share a photo, a quick update, or a little moment from your day.</p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={requestCompose} className="inline-flex min-h-11 items-center rounded-xl bg-terra px-4 text-sm font-semibold text-white">
                      Share your first moment
                    </button>
                    {manages ? (
                      <Link href="/family" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold">
                        Invite family
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onChange={(next) => setPosts((current) => current.map((item) => (item.id === next.id ? next : item)))}
                onDelete={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
              />
            ))}
            {cursor ? (
              <button type="button" onClick={() => void load(false, cursor)} className="min-h-11 w-full rounded-xl border border-line bg-card text-sm font-semibold">
                Show earlier updates
              </button>
            ) : null}
          </section>
        </div>

        {home ? (
          <aside className="mt-8 hidden space-y-4 min-[1440px]:mt-0 min-[1440px]:block">
            <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <h2 className="font-serif text-2xl text-ink">Your circle</h2>
              <p className="mt-1 truncate text-base font-medium">{user.active?.family.name}</p>
              {members.length > 0 ? <p className="mt-1 text-sm text-muted">{members.length} {members.length === 1 ? "person" : "people"}</p> : null}
              <ul className="mt-4 flex flex-wrap gap-2">
                {members.slice(0, 6).map((member) => (
                  <li key={member.user.id}>
                    <Link href={`/profile/${member.user.id}`} aria-label={member.user.name}>
                      <Avatar name={member.user.name} color={member.user.avatarColor} size={36} />
                    </Link>
                  </li>
                ))}
              </ul>
              {manages ? (
                <Link href="/family" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-terra">Invite family</Link>
              ) : (
                <Link href="/family" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-terra">View family</Link>
              )}
            </section>
            <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <h2 className="font-serif text-2xl text-ink">Live with your people</h2>
              {live ? (
                <>
                  <p className="mt-2 text-sm text-muted">{live.hostName} is live</p>
                  <p className="mt-1 font-medium">{live.title}</p>
                  <Link href={`/live/${live.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-terra px-4 text-sm font-semibold text-white">
                    Join live
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-muted">Start a live and the circle can watch, talk, and share a screen.</p>
                  <Link href="/live" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold">
                    Go live
                  </Link>
                </>
              )}
            </section>
          </aside>
        ) : null}
    </div>
  );
}

function CircleBanner({
  name,
  count,
  hasCover,
  coverVersion,
  manages,
  onCover,
}: {
  name: string;
  count: number;
  hasCover: boolean;
  coverVersion: number;
  manages: boolean;
  onCover: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const [coverError, setCoverError] = useState("");
  const showPhoto = hasCover && !broken;

  async function upload(file: File) {
    setCoverError("");
    const form = new FormData();
    form.set("file", file);
    const { ok, data } = await api<{ error?: string }>("/api/family/cover", { method: "POST", body: form });
    if (!ok) {
      setCoverError(errorMessage(data, "Could not save that photo."));
      return;
    }
    setBroken(false);
    onCover();
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-card shadow-card" aria-label={name}>
      <div className="relative h-56 bg-blush sm:h-64">
        {showPhoto ? (
          <img
            src={`/api/family/cover?v=${coverVersion}`}
            alt=""
            className="h-full w-full object-cover object-[center_42%]"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-start justify-end bg-gradient-to-br from-blush to-card p-5">
            <img src="/brand/km.png" alt="" className="h-12 w-12" />
            <p className="mt-3 max-w-xs text-sm text-muted">A photo of your people can live here.</p>
          </div>
        )}
        {manages ? (
          <label className="absolute bottom-3 right-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-card/95 px-3 text-sm font-semibold text-ink shadow-card">
            {showPhoto ? "Change cover" : "Add a cover photo"}
            <input
              type="file"
              accept={ACCEPT.photo}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      <div className="border-t border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-3xl text-ink">{name}</h2>
            <p className="mt-1 text-base text-muted">Your people. Your place.</p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
              <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" strokeLinecap="round" />
            </svg>
            Private circle
          </p>
        </div>
        {count > 0 ? <p className="mt-3 text-sm font-medium text-ink">{count} {count === 1 ? "person" : "people"}</p> : null}
        {coverError ? <p className="mt-2 text-sm text-terra" role="alert">{coverError}</p> : null}
      </div>
    </section>
  );
}

function StatusCard({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-8 text-center">
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
      <button type="button" onClick={onAction} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-terra px-4 text-sm font-semibold text-white">
        {action}
      </button>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1].map((item) => (
        <div key={item} className="rounded-2xl border border-line bg-card p-5">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-blush" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-32 rounded bg-blush" />
              <div className="h-3 w-16 rounded bg-line" />
            </div>
          </div>
          <div className="mt-4 h-28 rounded-xl bg-paper" />
        </div>
      ))}
      <p className="sr-only">Loading updates</p>
    </div>
  );
}

function EmptyMark() {
  return (
    <svg viewBox="0 0 64 64" className="mx-auto h-14 w-14 text-terra" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="8" y="14" width="48" height="36" rx="6" />
      <circle cx="22" cy="28" r="4" />
      <path d="M10 44 24 32l8 8 6-6 16 12" strokeLinejoin="round" />
    </svg>
  );
}
