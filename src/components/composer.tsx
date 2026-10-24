"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPT } from "@/components/accept";
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

export function Composer({ onPosted }: { onPosted: (post: PostDTO) => void }) {
  const [body, setBody] = useState("");
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
  draftsRef.current = drafts;

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
    onPosted(result.data.post);
  }

  return (
    <section className="rounded-[1.75rem] border border-line bg-card p-4 shadow-card sm:p-5">
      <label className="block">
        <span className="sr-only">Update</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="What should they know?"
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted"
        />
      </label>
      {drafts.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2 text-xs">
              {draft.url && draft.kind === "image" ? <img src={draft.url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : null}
              <span className="max-w-40 truncate">{draft.kind === "audio" && draft.file.name.startsWith("voice-note") ? "Voice note" : draft.file.name}</span>
              <span className="text-muted">{formatBytes(draft.file.size)}</span>
              <button type="button" onClick={() => removeDraft(draft.id)} className="font-semibold text-terra">Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      {recording ? <p className="mt-3 text-sm text-terra">Recording {seconds}s. Tap Voice again to stop.</p> : null}
      {pending && progress > 0 ? <p className="mt-3 text-sm text-muted">Uploading {Math.round(progress * 100)}%</p> : null}
      {error ? <p className="mt-3 text-sm text-terra">{error}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FileButton label="Photo" accept={ACCEPT.photo} onFiles={addFiles} />
        <FileButton label="Video" accept={ACCEPT.video} onFiles={addFiles} />
        <button type="button" onClick={() => void toggleRecord()} className="rounded-full border border-line px-3 py-2 text-sm font-medium">
          {recording ? "Stop" : "Voice"}
        </button>
        <FileButton label="File" accept={ACCEPT.file} onFiles={addFiles} />
        <button type="button" onClick={() => void publish()} disabled={pending} className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </section>
  );
}

function FileButton({ label, accept, onFiles }: { label: string; accept: string; onFiles: (files: FileList) => void }) {
  return (
    <label className="cursor-pointer rounded-full border border-line px-3 py-2 text-sm font-medium">
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
