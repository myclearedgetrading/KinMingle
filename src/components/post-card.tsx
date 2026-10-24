"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMOJIS } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client";
import { formatBytes, formatClock, timeAgo } from "@/lib/format";
import type { CommentDTO, PostDTO } from "@/lib/types";
import { useApp } from "@/components/shell";
import { Avatar } from "@/components/avatar";

export function PostCard({ post, onChange, onDelete }: { post: PostDTO; onChange: (post: PostDTO) => void; onDelete: (id: string) => void }) {
  const { user } = useApp();
  const [comments, setComments] = useState(post.comments);
  const [count, setCount] = useState(post.commentCount);
  const [reactions, setReactions] = useState(post.reactions);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const canDelete = post.author.id === user.id || user.admin || user.active?.role === "owner";

  useEffect(() => {
    setComments(post.comments);
    setCount(post.commentCount);
    setReactions(post.reactions);
  }, [post]);

  async function react(emoji: string) {
    const { ok, data } = await api<{ reactions: PostDTO["reactions"]; error?: string }>(`/api/posts/${post.id}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
    if (!ok) {
      setError(errorMessage(data, "Could not save that reaction."));
      return;
    }
    setReactions(data.reactions);
  }

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    const body = comment.trim();
    if (!body) return;
    const { ok, data } = await api<{ comment: CommentDTO; commentCount: number; error?: string }>(`/api/posts/${post.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (!ok) {
      setError(errorMessage(data, "Could not add the comment."));
      return;
    }
    setComments((current) => [...current, data.comment]);
    setCount(data.commentCount);
    setComment("");
  }

  async function loadAll() {
    const { ok, data } = await api<{ post: PostDTO }>(`/api/posts/${post.id}?view=full`);
    if (!ok) return;
    setComments(data.post.comments);
    setCount(data.post.commentCount);
    onChange(data.post);
  }

  async function removeComment(id: string) {
    const { ok } = await api(`/api/comments/${id}`, { method: "DELETE" });
    if (!ok) return;
    setComments((current) => current.filter((item) => item.id !== id));
    setCount((value) => Math.max(0, value - 1));
  }

  async function removePost() {
    const { ok, data } = await api(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!ok) {
      setError(errorMessage(data, "Could not remove that update."));
      return;
    }
    onDelete(post.id);
  }

  const grouped = EMOJIS.map((emoji) => ({
    emoji,
    count: reactions.filter((item) => item.emoji === emoji).length,
    mine: reactions.some((item) => item.emoji === emoji && item.userId === user.id),
  }));

  return (
    <article className="rounded-[1.75rem] border border-line bg-card p-4 shadow-card sm:p-5">
      <header className="flex items-start gap-3">
        <Link href={`/profile/${post.author.id}`}><Avatar name={post.author.name} color={post.author.avatarColor} /></Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author.id}`} className="font-semibold">{post.author.name}</Link>
          <time dateTime={post.createdAt} className="mt-0.5 block text-xs text-muted" title={new Date(post.createdAt).toLocaleString()}>
            {timeAgo(post.createdAt)}
          </time>
        </div>
        {canDelete ? (
          confirming ? (
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => void removePost()} className="font-semibold text-terra">Delete</button>
              <button type="button" onClick={() => setConfirming(false)} className="text-muted">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="text-xs text-muted">Remove</button>
          )
        ) : null}
      </header>
      {post.body ? <p className="mt-4 whitespace-pre-wrap break-words text-[1.05rem] leading-relaxed">{linkify(post.body)}</p> : null}
      {post.live ? (
        <Link href={`/live/${post.live.id}`} className="mt-4 flex items-center justify-between rounded-2xl bg-night px-4 py-3 text-paper">
          <span>
            <span className="block text-xs uppercase tracking-[0.16em] text-[#9ec5ff]">
              {post.live.status === "live" ? "Live now" : post.media.some((item) => item.kind === "video") ? "Recording saved" : "Live ended"}
            </span>
            <span className="mt-1 block font-serif text-2xl">{post.live.title}</span>
          </span>
          <span className="text-sm font-semibold">{post.live.status === "live" ? "Watch" : "Open"}</span>
        </Link>
      ) : null}
      <MediaGrid media={post.media} onOpen={setOpenImage} />
      <div className="mt-4 flex flex-wrap gap-2">
        {grouped.map((item) => (
          <button
            key={item.emoji}
            type="button"
            onClick={() => void react(item.emoji)}
            className={`rounded-full border px-3 py-1.5 text-sm ${item.mine ? "border-terra bg-blush" : "border-line"}`}
            aria-pressed={item.mine}
          >
            {item.emoji} {item.count > 0 ? item.count : ""}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {comments.map((item) => (
          <div key={item.id} className="flex gap-2 text-sm">
            <Avatar name={item.author.name} color={item.author.avatarColor} size={28} />
            <p className="min-w-0 flex-1">
              <Link href={`/profile/${item.author.id}`} className="font-semibold">{item.author.name}</Link>{" "}
              <span className="whitespace-pre-wrap break-words">{item.body}</span>
            </p>
            {item.author.id === user.id ? (
              <button type="button" onClick={() => void removeComment(item.id)} className="text-xs text-muted">Remove</button>
            ) : null}
          </div>
        ))}
        {count > comments.length ? (
          <button type="button" onClick={() => void loadAll()} className="text-sm font-semibold text-pine">
            Show all {count} comments
          </button>
        ) : null}
        <form onSubmit={sendComment} className="flex gap-2">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            maxLength={1000}
            className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2 text-sm"
          />
          <button type="submit" className="rounded-full px-3 text-sm font-semibold text-pine">Send</button>
        </form>
      </div>
      {error ? <p className="mt-3 text-sm text-terra">{error}</p> : null}
      {openImage ? (
        <button type="button" className="fixed inset-0 z-40 grid place-items-center bg-night/80 p-6" onClick={() => setOpenImage(null)}>
          <img src={openImage} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </article>
  );
}

export function PostDetail({ initial }: { initial: PostDTO }) {
  const [post, setPost] = useState(initial);
  const [missing, setMissing] = useState(false);
  if (missing) return <p className="rounded-[1.75rem] border border-line bg-card p-6 text-muted">This update was removed.</p>;
  return <PostCard post={post} onChange={setPost} onDelete={() => setMissing(true)} />;
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
    part.match(/^https?:\/\//) ? (
      <a key={index} href={part} target="_blank" rel="noreferrer" className="underline decoration-terra/40 underline-offset-2">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function MediaGrid({ media, onOpen }: { media: PostDTO["media"]; onOpen: (url: string) => void }) {
  if (media.length === 0) return null;
  const images = media.filter((item) => item.kind === "image");
  const rest = media.filter((item) => item.kind !== "image");
  return (
    <div className="mt-4 space-y-3">
      {images.length > 0 ? (
        <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item.url)} className="overflow-hidden rounded-2xl bg-paper">
              <img
                src={item.url}
                alt={item.name}
                className={images.length === 1 ? "max-h-[36rem] w-full object-contain" : "aspect-[4/3] w-full object-contain"}
              />
            </button>
          ))}
        </div>
      ) : null}
      {rest.map((item) => {
        if (item.kind === "video") {
          return <video key={item.id} src={item.url} controls playsInline preload="metadata" className="max-h-[32rem] w-full rounded-2xl bg-night" />;
        }
        if (item.kind === "audio") return <VoiceNote key={item.id} src={item.url} name={item.name} />;
        return (
          <a key={item.id} href={item.url} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
            <span className="truncate font-medium">{item.name}</span>
            <span className="shrink-0 text-muted">{formatBytes(item.size)}</span>
          </a>
        );
      })}
    </div>
  );
}

function VoiceNote({ src, name }: { src: string; name: string }) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const label = name.startsWith("voice-note") ? "Voice note" : name;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2">
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full bg-pine text-sm font-semibold text-white"
        onClick={() => {
          if (!audio) return;
          if (audio.paused) void audio.play();
          else audio.pause();
        }}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? "II" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span className="truncate">{label}</span>
          <span>{formatClock(duration ? progress * duration : 0)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          aria-label="Voice note position"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audio && duration) audio.currentTime = next * duration;
            setProgress(next);
          }}
          className="w-full accent-pine"
        />
      </div>
      <audio
        ref={setAudio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => {
          const node = event.currentTarget;
          if (node.duration) setProgress(node.currentTime / node.duration);
        }}
      />
    </div>
  );
}
