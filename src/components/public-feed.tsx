"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/client";
import type { PostDTO } from "@/lib/types";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { useApp } from "@/components/shell";

export function PublicFeed() {
  const { user, composeNonce } = useApp();
  const [posts, setPosts] = useState<PostDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSignal, setOpenSignal] = useState(0);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");

  async function load(reset: boolean, nextCursor?: string | null) {
    const params = new URLSearchParams({ scope: "public" });
    if (!reset && nextCursor) params.set("cursor", nextCursor);
    const { ok, data } = await api<{ posts: PostDTO[]; nextCursor: string | null; error?: string }>(`/api/posts?${params}`);
    setLoading(false);
    if (!ok) {
      setError(errorMessage(data, "Could not load the feed."));
      return;
    }
    setError("");
    setCursor(data.nextCursor);
    setPosts((current) => (reset ? data.posts : [...current, ...data.posts]));
  }

  useEffect(() => {
    void load(true);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("kinmingle-compose") === "1") {
      sessionStorage.removeItem("kinmingle-compose");
      setOpenSignal((value) => value + 1);
    }
  }, []);

  useEffect(() => {
    if (!composeNonce) return;
    setOpenSignal((value) => value + 1);
  }, [composeNonce]);

  async function joinCircle(event: React.FormEvent) {
    event.preventDefault();
    const { ok, data } = await api<{ familyId?: string; error?: string }>("/api/family/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: code }),
    });
    if (!ok || !data.familyId) {
      setJoinError(errorMessage(data, "Could not join with that code."));
      return;
    }
    window.location.href = `/circles/${data.familyId}`;
  }

  return (
    <div className="mx-auto grid max-w-[760px] gap-6 min-[1440px]:max-w-[1100px] min-[1440px]:grid-cols-[minmax(0,760px)_300px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Hey {user.name} 👋</h1>
          <p className="mt-2 text-muted">What’s happening on KinMingle?</p>
        </div>
        <Composer
          destination="public"
          openSignal={openSignal}
          onPosted={(post) => {
            if (post.visibility !== "public") return;
            setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
          }}
        />
        {error ? <p className="text-sm text-terra">{error}</p> : null}
        {loading ? <p className="text-sm text-muted">Loading updates</p> : null}
        {!loading && posts.length === 0 ? (
          <section className="rounded-[1.75rem] border border-line bg-card p-6 shadow-card">
            <h2 className="font-serif text-3xl">The community is quiet so far.</h2>
            <p className="mt-2 text-muted">Share a photo, a note, or a little moment. Family circles stay private until you choose them.</p>
          </section>
        ) : null}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onChange={(next) => setPosts((current) => current.map((item) => (item.id === next.id ? next : item)))}
            onDelete={(id) => setPosts((current) => current.filter((item) => item.id !== id))}
            onShared={(next) => setPosts((current) => [next, ...current])}
          />
        ))}
        {cursor ? (
          <button type="button" onClick={() => void load(false, cursor)} className="min-h-11 w-full rounded-xl border border-line bg-card text-sm font-semibold">
            Show more
          </button>
        ) : null}
      </div>
      <aside className="hidden min-[1440px]:block">
        <div className="sticky top-8 space-y-4">
          <section className="rounded-[1.75rem] border border-line bg-card p-5 shadow-card">
            <h2 className="font-serif text-2xl">My family circles</h2>
            {user.memberships.length === 0 ? (
              <p className="mt-3 text-sm text-muted">You haven’t joined a private circle yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {user.memberships.map((item) => (
                  <li key={item.family.id}>
                    <Link href={`/circles/${item.family.id}`} className="block rounded-xl px-3 py-2 font-semibold hover:bg-blush">
                      {item.family.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/circles" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-terra">
              Open family circles
            </Link>
          </section>
          <section className="rounded-[1.75rem] border border-line bg-card p-5 shadow-card">
            <h2 className="font-serif text-2xl">Have an invite?</h2>
            <form onSubmit={joinCircle} className="mt-3 space-y-2">
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Invite code" className="w-full rounded-xl border border-line bg-paper px-3 py-2 uppercase" />
              <button type="submit" className="min-h-11 rounded-xl bg-terra px-4 text-sm font-semibold text-white">Join circle</button>
            </form>
            {joinError ? <p className="mt-2 text-sm text-terra">{joinError}</p> : null}
          </section>
          {user.hasCircle ? (
            <Link href="/live" className="block rounded-[1.75rem] border border-line bg-card p-5 shadow-card">
              <h2 className="font-serif text-2xl">Go live</h2>
              <p className="mt-2 text-sm text-muted">Start a live inside your circle. Lives stay private.</p>
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
