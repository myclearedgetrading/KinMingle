"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import type { PostDTO } from "@/lib/types";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { useApp } from "@/components/shell";
import Link from "next/link";

const filters = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Video" },
  { id: "voice", label: "Voice" },
  { id: "file", label: "Files" },
  { id: "live", label: "Live" },
];

export function Feed({ authorId, showComposer = true }: { authorId?: string; showComposer?: boolean }) {
  const { user, liveNow, online, subscribe } = useApp();
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(reset: boolean, nextCursor?: string | null) {
    if (!user.hasCircle) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    if (query.trim()) params.set("q", query.trim());
    if (authorId) params.set("authorId", authorId);
    if (!reset && nextCursor) params.set("cursor", nextCursor);
    const { ok, data } = await api<{ posts: PostDTO[]; nextCursor: string | null; error?: string }>(`/api/posts?${params}`);
    setLoading(false);
    if (!ok) {
      setError(errorMessage(data, "Could not load the room."));
      return;
    }
    setCursor(data.nextCursor);
    setPosts((current) => (reset ? data.posts : [...current, ...data.posts]));
  }

  useEffect(() => {
    setLoading(true);
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

  if (!user.hasCircle) {
    return (
      <section className="mx-auto max-w-xl rounded-[1.75rem] border border-line bg-card p-8 shadow-card">
        <h1 className="font-serif text-4xl">Start with the people who belong here.</h1>
        <p className="mt-3 text-muted">Create a circle for your family, or join one with the invite code they sent you.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/family" className="rounded-full bg-terra px-4 py-2 text-sm font-semibold text-white">Open family</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,640px)_280px]">
      <div className="space-y-5">
        {liveNow[0] ? (
          <Link href={`/live/${liveNow[0].id}`} className="flex items-center justify-between rounded-[1.5rem] bg-night px-5 py-4 text-paper">
            <span>
              <span className="text-xs uppercase tracking-[0.16em] text-[#9ec5ff]">Live now</span>
              <span className="mt-1 block font-serif text-2xl">{liveNow[0].hostName} · {liveNow[0].title}</span>
            </span>
            <span className="text-sm font-semibold">Join</span>
          </Link>
        ) : null}
        {showComposer ? <Composer onPosted={(post) => setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)])} /> : null}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setKind(filter.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${kind === filter.id ? "bg-ink text-white" : "bg-card text-muted"}`}
            >
              {filter.label}
            </button>
          ))}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the room"
            className="ml-auto w-full rounded-full border border-line bg-card px-4 py-2 text-sm sm:w-52"
          />
        </div>
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        {loading ? <p className="text-sm text-muted">Gathering updates…</p> : null}
        {!loading && posts.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-line px-5 py-10 text-center text-muted">
            {authorId ? "Nothing from them yet." : "This room is quiet. Tell them how the day went."}
          </p>
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
          <button type="button" onClick={() => void load(false, cursor)} className="w-full rounded-full border border-line bg-card py-3 text-sm font-semibold">
            Show earlier updates
          </button>
        ) : null}
      </div>
      <aside className="hidden space-y-4 xl:block">
        <section className="rounded-[1.5rem] border border-line bg-card p-5">
          <h2 className="font-serif text-2xl">{user.active?.family.name}</h2>
          <p className="mt-1 text-sm text-muted">{online.length} here now</p>
          <ul className="mt-4 space-y-2 text-sm">
            {online.map((person) => <li key={person.id}>{person.name}</li>)}
            {online.length === 0 ? <li className="text-muted">Just you, for the moment.</li> : null}
          </ul>
        </section>
      </aside>
    </div>
  );
}
