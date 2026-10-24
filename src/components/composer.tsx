"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPT } from "@/components/accept";
import { Avatar } from "@/components/avatar";
import { useApp } from "@/components/shell";
import { api, errorMessage } from "@/lib/client";
import { formatBytes } from "@/lib/format";
import type { PostDTO } from "@/lib/types";

type Draft = { id: string; file: File; kind: "image" | "video" | "audio" | "file"; url?: string };

const caps = { image: 20, video: 100, audio: 30, file: 50 };

function kindFor(file: File, forceVoice = false): Draft["kind"] | null {
  if (forceVoice || file.name.startsWith("voice-note")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function Composer({ onPosted, openSignal = 0 }: { onPosted: (post: PostDTO) => void; openSignal?: number }) {
  const { user } = useApp();
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftsRef = useRef(drafts);
  const box = useRef<HTMLTextAreaElement>(null);
  draftsRef.current = drafts;

  useEffect(() => {
    if (!openSignal) return;
    setExpanded(true);
    const frame = requestAnimationFrame(() => {
      document.getElementById("share-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
      box.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [openSignal]);

  useEffect(() => () => {
    draftsRef.current.forEach((draft) => draft.url && URL.revokeObjectURL(draft.url));
    if (timer.current) clearInterval(timer.current);
  }, []);

  function addFiles(list: FileList | File[], forceVoice = false) {
    const next: Draft[] = [];
    for (const file of Array.from(list)) {
      const kind = kindFor(file, forceVoice);
      if (!kind) continue;
      if (file.size > caps[kind] * 1024 * 1024) {
        setError(`${file.name} is over ${caps[kind]} MB.`);
        continue;
      }
      const url = kind === "image" || kind === "audio" ? URL.createObjectURL(file) : undefined;
      next.push({ id: crypto.randomUUID(), file, kind, url });
    }
    setDrafts((current) => [...current, ...next].slice(0, 8));
    if (next.length) setExpanded(true);
  }

  function removeDraft(id: string) {
    setDrafts((current) => {
      const found = current.find((item) => item.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return current.filter((item) => item.id !== id);
    });
  }

  async function toggleRecord() {
    if (recording && recorder.current) {
      recorder.current.stop();
      setRecording(false);
      if (timer.current) clearInterval(timer.current);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError("Voice notes need a secure page. On this computer, open KinMingle at localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : undefined;
      const media = new MediaRecorder(stream, options);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = media.mimeType || "audio/webm";
        const file = new File(chunks.current, "voice-note.webm", { type });
        addFiles([file], true);
        setSeconds(0);
      };
      recorder.current = media;
      media.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setError("KinMingle couldn't use the microphone. Allow access, then try again.");
    }
  }

  async function publish() {
    if (pending) return;
    if (!body.trim() && drafts.length === 0) {
      setError("Write something or attach a file.");
      return;
    }
    setPending(true);
    setError("");
    setProgress(0);
    const form = new FormData();
    form.set("body", body.trim());
    drafts.forEach((draft) => form.append("files", draft.file, draft.file.name));
    const result = await new Promise<{ ok: boolean; data: { post?: PostDTO; error?: string } }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/posts");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(event.loaded / event.total);
      };
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText || "{}");
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
      };
      xhr.onerror = () => resolve({ ok: false, data: { error: "The upload didn't finish." } });
      xhr.send(form);
    });
    setPending(false);
    if (!result.ok || !result.data.post) {
      setError(errorMessage(result.data, "The update didn't post."));
      return;
    }
    drafts.forEach((draft) => draft.url && URL.revokeObjectURL(draft.url));
    setDrafts([]);
    setBody("");
    setProgress(0);
    setExpanded(false);
    onPosted(result.data.post);
  }

  const canPost = Boolean(body.trim() || drafts.length);

  return (
    <section id="share-composer" className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} color={user.avatarColor} />
        {expanded ? (
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Share a moment with the family</span>
            <textarea
              ref={box}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Share a moment with the family…"
              className="w-full resize-none rounded-xl bg-paper px-4 py-3 text-base leading-relaxed outline-none placeholder:text-muted"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-11 min-w-0 flex-1 rounded-xl bg-paper px-4 text-left text-base text-muted"
          >
            Share a moment with the family…
          </button>
        )}
      </div>
      {drafts.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-xs">
              {draft.url && draft.kind === "image" ? <img src={draft.url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : null}
              <span className="max-w-40 truncate">{draft.kind === "audio" && draft.file.name.startsWith("voice-note") ? "Voice note" : draft.file.name}</span>
              <span className="text-muted">{formatBytes(draft.file.size)}</span>
              <button type="button" onClick={() => removeDraft(draft.id)} className="font-semibold text-terra">Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      {recording ? <p className="mt-3 text-sm text-terra">Recording {seconds}s. Tap Voice again to stop.</p> : null}
      {pending && progress > 0 ? (
        <p className="mt-3 text-sm text-muted" role="status">Uploading {Math.round(progress * 100)}%</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-terra" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
          <FileButton label="Photo" icon="photo" accept={ACCEPT.photo} onFiles={addFiles} />
          <FileButton label="Video" icon="video" accept={ACCEPT.video} onFiles={addFiles} />
          <button type="button" onClick={() => { setExpanded(true); void toggleRecord(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium">
            <ActionIcon name="voice" />
            {recording ? "Stop" : "Voice"}
          </button>
          <FileButton label="File" icon="file" accept={ACCEPT.file} onFiles={addFiles} />
        </div>
        {expanded ? (
          <button
            type="button"
            onClick={() => void publish()}
            disabled={pending || !canPost}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-terra px-5 text-sm font-semibold text-white hover:bg-[#0046ba] disabled:opacity-50"
          >
            {pending ? "Posting…" : "Post"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function FileButton({ label, icon, accept, onFiles }: { label: string; icon: string; accept: string; onFiles: (files: FileList) => void }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium">
      <ActionIcon name={icon} />
      {label}
      <input
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function ActionIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-terra" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {name === "photo" && (
        <>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.3" />
          <path d="M4 16.5 8.5 12l3 3 2.2-2.2L20 17" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {name === "video" && (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10.5 21 8v8l-5-2.5z" strokeLinejoin="round" />
        </>
      )}
      {name === "voice" && (
        <>
          <rect x="9" y="3.5" width="6" height="10" rx="3" />
          <path d="M7 11a5 5 0 0 0 10 0M12 16v4.5" strokeLinecap="round" />
        </>
      )}
      {name === "file" && (
        <>
          <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" strokeLinejoin="round" />
          <path d="M14 3.5V8h4.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
