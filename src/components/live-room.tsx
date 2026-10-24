"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { RoomRecorder, type RecordedStream } from "@/components/room-recorder";
import type { RealtimeMessage } from "@/components/shell";
import { useApp } from "@/components/shell";

type Person = { connId: string; userId?: string; name?: string; role?: string };
type Chat = { id: string; body: string; createdAt: string; author: { id: string; name: string; avatarColor: string } };
type Session = {
  id: string;
  title: string;
  status: string;
  hostId: string;
  recordingUrl: string | null;
  host: { id: string; name: string; avatarColor: string };
};
type Signal = { kind?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type Peer = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  pending: RTCIceCandidateInit[];
  videoSender: RTCRtpSender | null;
  name: string;
};

const ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
const MAX_RECORDING = 250 * 1024 * 1024;

async function uploadRecording(sessionId: string, blob: Blob) {
  const type = (blob.type || "video/webm").split(";")[0] || "video/webm";
  const ext = type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `live-recording.${ext}`, { type });
  const form = new FormData();
  form.set("file", file);
  return api<{ url?: string; error?: string; already?: boolean }>(`/api/live/${sessionId}/recording`, { method: "POST", body: form });
}

export function LiveRoom({ sessionId }: { sessionId: string }) {
  const { user, send, subscribe } = useApp();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selfId, setSelfId] = useState("");
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [displaced, setDisplaced] = useState(false);
  const [mediaTick, setMediaTick] = useState(0);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const displacedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  const peersRef = useRef(new Map<string, Peer>());
  const selfRef = useRef("");
  const sendRef = useRef(send);
  const listRef = useRef<HTMLDivElement>(null);
  const onMessage = useRef<(message: RealtimeMessage) => void>(() => undefined);
  const recorderRef = useRef<RoomRecorder | null>(null);
  const finishing = useRef(false);
  const previewRef = useRef<MediaStream | null>(null);
  const remotesRef = useRef<Record<string, MediaStream>>({});
  const peopleRef = useRef<Person[]>([]);
  sendRef.current = send;
  previewRef.current = preview;
  remotesRef.current = remotes;
  peopleRef.current = people;

  const hosting = session?.hostId === user.id && session.status === "live";
  const live = session?.status === "live";

  function bump() {
    setMediaTick((value) => value + 1);
  }

  function localStream() {
    if (!streamRef.current) streamRef.current = new MediaStream();
    return streamRef.current;
  }

  function refreshPreview() {
    const tracks: MediaStreamTrack[] = [];
    const video = screenTrack.current?.readyState === "live" ? screenTrack.current : cameraTrack.current;
    const audio = streamRef.current?.getAudioTracks()[0];
    if (video && video.readyState === "live") tracks.push(video);
    if (audio && audio.readyState === "live") tracks.push(audio);
    setPreview(tracks.length ? new MediaStream(tracks) : null);
  }

  function watchTrack(track: MediaStreamTrack) {
    const update = () => bump();
    track.onmute = update;
    track.onunmute = update;
    track.onended = update;
  }

  function attachTrack(track: MediaStreamTrack, kind: "audio" | "video") {
    const stream = localStream();
    if (kind === "video") {
      for (const existing of [...stream.getVideoTracks()]) {
        if (existing !== track) stream.removeTrack(existing);
      }
    }
    if (!stream.getTracks().includes(track)) stream.addTrack(track);
    watchTrack(track);
    for (const peer of peersRef.current.values()) {
      if (kind === "video" && peer.videoSender) {
        void peer.videoSender.replaceTrack(track);
        continue;
      }
      if (peer.pc.getSenders().some((sender) => sender.track === track)) continue;
      const sender = peer.pc.addTrack(track, stream);
      if (kind === "video") peer.videoSender = sender;
    }
    refreshPreview();
  }

  function closePeer(id: string) {
    peersRef.current.get(id)?.pc.close();
    peersRef.current.delete(id);
    setRemotes((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function ensurePeer(person: Person) {
    if (!selfRef.current || person.connId === selfRef.current || peersRef.current.has(person.connId)) return;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer: Peer = {
      pc,
      polite: selfRef.current > person.connId,
      makingOffer: false,
      pending: [],
      videoSender: null,
      name: person.name || "Someone",
    };
    peersRef.current.set(person.connId, peer);
    pc.onicecandidate = (event) => {
      if (event.candidate) sendRef.current({ type: "signal", to: person.connId, data: { kind: "ice", candidate: event.candidate } });
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0] || new MediaStream([event.track]);
      watchTrack(event.track);
      setRemotes((current) => ({ ...current, [person.connId]: remote }));
    };
    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        sendRef.current({ type: "signal", to: person.connId, data: { kind: "offer", sdp: pc.localDescription } });
      } catch {
        // A newer offer replaces one that was interrupted.
      } finally {
        peer.makingOffer = false;
      }
    };
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        if (track.readyState !== "live") continue;
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") peer.videoSender = sender;
      }
    }
  }

  function syncPeople(list: Person[]) {
    const ids = new Set(list.map((person) => person.connId).filter((id) => id !== selfRef.current));
    for (const id of [...peersRef.current.keys()]) {
      if (!ids.has(id)) closePeer(id);
    }
    list.forEach((person) => ensurePeer(person));
  }

  async function handleSignal(from: string, data: unknown) {
    const signal = data as Signal;
    if (!signal?.kind || !selfRef.current || from === selfRef.current) return;
    if (!peersRef.current.has(from)) ensurePeer({ connId: from, name: people.find((person) => person.connId === from)?.name || "Someone" });
    const peer = peersRef.current.get(from);
    if (!peer) return;
    const pc = peer.pc;
    try {
      if (signal.kind === "offer" && signal.sdp) {
        const collision = peer.makingOffer || pc.signalingState !== "stable";
        if (collision) {
          if (!peer.polite) return;
          await pc.setLocalDescription({ type: "rollback" });
        }
        await pc.setRemoteDescription(signal.sdp);
        for (const candidate of peer.pending) await pc.addIceCandidate(candidate);
        peer.pending = [];
        await pc.setLocalDescription(await pc.createAnswer());
        sendRef.current({ type: "signal", to: from, data: { kind: "answer", sdp: pc.localDescription } });
      } else if (signal.kind === "answer" && signal.sdp) {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(signal.sdp);
          for (const candidate of peer.pending) await pc.addIceCandidate(candidate);
          peer.pending = [];
        }
      } else if (signal.kind === "ice" && signal.candidate) {
        if (!pc.remoteDescription) peer.pending.push(signal.candidate);
        else await pc.addIceCandidate(signal.candidate);
      }
    } catch {
      // Late signals from someone who already left are safe to drop.
    }
  }

  async function ensureAudio() {
    const existing = streamRef.current?.getAudioTracks().find((track) => track.readyState === "live");
    if (existing) return existing;
    const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const track = captured.getAudioTracks()[0];
    if (!track) throw new Error("no audio");
    attachTrack(track, "audio");
    return track;
  }

  async function ensureCamera() {
    if (cameraTrack.current?.readyState === "live") return cameraTrack.current;
    const captured = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    const track = captured.getVideoTracks()[0];
    if (!track) throw new Error("no video");
    cameraTrack.current = track;
    attachTrack(track, "video");
    return track;
  }

  function mediaBlocked() {
    if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function") return false;
    setError("Camera and microphone need a secure page. On this computer, open http://localhost:3000.");
    return true;
  }

  useEffect(() => {
    let ignore = false;
    void (async () => {
      const [room, chat] = await Promise.all([
        api<{ session: Session }>(`/api/live/${sessionId}`),
        api<{ messages: Chat[] }>(`/api/live/${sessionId}/chat`),
      ]);
      if (ignore) return;
      if (!room.ok) {
        setError(errorMessage(room.data, "That stream doesn't exist."));
        return;
      }
      setSession(room.data.session);
      setRecordingUrl(room.data.session.recordingUrl);
      if (chat.ok) setMessages(chat.data.messages);
    })();
    return () => {
      ignore = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session || session.status !== "live") return;
    const hostId = session.hostId;
    let cancelled = false;
    sendRef.current({ type: "join-live", sessionId });

    async function publish() {
      if (hostId !== user.id || cancelled) return;
      if (!window.isSecureContext || typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setError("Live video needs a secure page. On this computer, open http://localhost:3000.");
        return;
      }
      try {
        await ensureAudio();
        if (cancelled || displacedRef.current) {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          return;
        }
        await ensureCamera();
        if (cancelled || displacedRef.current) {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          return;
        }
        setMicOn(true);
        setCamOn(true);
      } catch {
        if (!cancelled) setError("Allow the camera and microphone, then try again.");
      }
      if (cancelled || displacedRef.current || recorderRef.current) return;
      try {
        const recorder = new RoomRecorder();
        await recorder.start();
        if (cancelled || displacedRef.current) {
          recorder.discard();
          return;
        }
        recorderRef.current = recorder;
        setRecording(true);
      } catch {
        if (!cancelled) setError("This browser can't save a recording of the live. The call still works.");
      }
    }

    void publish();
    return () => {
      cancelled = true;
      if (!finishing.current) {
        recorderRef.current?.discard();
        recorderRef.current = null;
      }
      sendRef.current({ type: "leave-live", sessionId });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenTrack.current?.stop();
      streamRef.current = null;
      cameraTrack.current = null;
      screenTrack.current = null;
      peersRef.current.forEach((peer) => peer.pc.close());
      peersRef.current.clear();
      setRemotes({});
      setPreview(null);
      setMicOn(false);
      setCamOn(false);
      setSharing(false);
    };
    // Media helpers are stable enough for the lifetime of this live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, session?.hostId, user.id, sessionId]);

  useEffect(() => {
    if (!live || !selfId) return;
    syncPeople(people);
    // syncPeople reads refs that are updated alongside this state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, selfId, live]);

  useEffect(() => subscribe((message) => onMessage.current(message)), [subscribe]);

  useEffect(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    const items: RecordedStream[] = [];
    if (preview) items.push({ id: "you", label: user.name, stream: preview });
    for (const [id, stream] of Object.entries(remotes)) {
      const person = people.find((item) => item.connId === id);
      items.push({ id, label: person?.name || "Someone", stream });
    }
    recorder.setStreams(items);
  }, [preview, remotes, people, recording, user.name]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  onMessage.current = (message) => {
    if (message.type === "authed" && session?.status === "live" && !displacedRef.current) {
      sendRef.current({ type: "join-live", sessionId });
    }
    if (message.type === "room" && message.sessionId === sessionId) {
      const id = String(message.selfConnId || "");
      if (id) {
        selfRef.current = id;
        setSelfId(id);
      }
      setPeople((message.participants as Person[]) || []);
    }
    if (message.type === "signal") void handleSignal(String(message.from || ""), message.data);
    if (message.type === "chat:new" && message.sessionId === sessionId) {
      const chat = message.message as Chat;
      setMessages((current) => (current.some((item) => item.id === chat.id) ? current : [...current, chat]));
    }
    if (message.type === "live-ended" && message.sessionId === sessionId) {
      void finishRecording().finally(() => {
        setSession((current) => (current ? { ...current, status: "ended" } : current));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        void loadSavedRecording();
      });
    }
    if (message.type === "host-replaced") {
      displacedRef.current = true;
      recorderRef.current?.discard();
      recorderRef.current = null;
      setRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      screenTrack.current?.stop();
      setMicOn(false);
      setCamOn(false);
      setSharing(false);
      setPreview(null);
      setDisplaced(true);
      sendRef.current({ type: "leave-live", sessionId });
      setError("This live is already open on another screen.");
    }
    if (message.type === "error" && typeof message.message === "string") setError(message.message);
  };

  async function toggleMic() {
    if (mediaBlocked()) return;
    const existing = streamRef.current?.getAudioTracks().find((track) => track.readyState === "live");
    if (existing) {
      existing.enabled = !existing.enabled;
      setMicOn(existing.enabled);
      return;
    }
    try {
      const track = await ensureAudio();
      track.enabled = true;
      setMicOn(true);
      setError("");
    } catch {
      setError("Allow the microphone, then try again.");
    }
  }

  async function toggleCam() {
    if (sharing) {
      setError("Stop sharing your screen before changing the camera.");
      return;
    }
    if (mediaBlocked()) return;
    if (cameraTrack.current?.readyState === "live") {
      cameraTrack.current.enabled = !cameraTrack.current.enabled;
      setCamOn(cameraTrack.current.enabled);
      refreshPreview();
      return;
    }
    try {
      const track = await ensureCamera();
      track.enabled = true;
      setCamOn(true);
      setError("");
    } catch {
      setError("Allow the camera, then try again.");
    }
  }

  async function stopSharing() {
    const track = screenTrack.current;
    screenTrack.current = null;
    if (track) {
      track.onended = null;
      track.stop();
    }
    setSharing(false);
    const camera = cameraTrack.current;
    const next = camera && camera.readyState === "live" && camera.enabled ? camera : null;
    const stream = streamRef.current;
    if (stream) {
      for (const existing of [...stream.getVideoTracks()]) stream.removeTrack(existing);
      if (next) stream.addTrack(next);
    }
    for (const peer of peersRef.current.values()) {
      if (peer.videoSender) await peer.videoSender.replaceTrack(next);
    }
    refreshPreview();
  }

  async function toggleScreen() {
    if (screenTrack.current) {
      await stopSharing();
      return;
    }
    if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
      setError("This browser can't share a screen.");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = display.getVideoTracks()[0];
      if (!track) return;
      screenTrack.current = track;
      setSharing(true);
      attachTrack(track, "video");
      track.onended = () => {
        if (screenTrack.current === track) void stopSharing();
      };
      setError("");
    } catch {
      setError("Screen sharing was cancelled.");
    }
  }

  async function loadSavedRecording() {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const room = await api<{ session: Session }>(`/api/live/${sessionId}`);
      if (room.ok && room.data.session.recordingUrl) {
        setRecordingUrl(room.data.session.recordingUrl);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async function finishRecording() {
    if (finishing.current) return;
    const recorder = recorderRef.current;
    if (!recorder) return;
    finishing.current = true;
    recorderRef.current = null;
    setRecording(false);
    setSaving(true);
    try {
      const blob = await recorder.stop();
      if (!blob) return;
      if (blob.size > MAX_RECORDING) {
        setError("The recording is over 250 MB, so it wasn't saved. A shorter live will save.");
        return;
      }
      const { ok, data } = await uploadRecording(sessionId, blob);
      if (!ok) setError(errorMessage(data, "The recording didn't save."));
      else if (data.url) setRecordingUrl(data.url);
    } catch {
      setError("The recording didn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function endLive() {
    await finishRecording();
    const { ok, data } = await api(`/api/live/${sessionId}`, { method: "PATCH", body: JSON.stringify({ status: "ended" }) });
    if (!ok) setError(errorMessage(data, "Could not end the live."));
  }

  async function sendChat(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const { ok, data } = await api<{ message: Chat }>(`/api/live/${sessionId}/chat`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (!ok) {
      setError(errorMessage(data, "Could not send that."));
      return;
    }
    setMessages((current) => (current.some((item) => item.id === data.message.id) ? current : [...current, data.message]));
  }

  if (!session && !error) return <p className="text-sm text-muted">Opening the live room…</p>;
  if (!session) return <p className="text-sm text-terra">{error}</p>;

  const tiles = buildTiles({ people, remotes, preview, selfId, hosting, camOn, sharing, micOn, userName: user.name });
  void mediaTick;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-[1.75rem] bg-night text-paper">
        <div className={`grid gap-2 p-2 ${tiles.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {!live && recordingUrl ? (
            <video src={recordingUrl} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />
          ) : tiles.length === 0 ? (
            <div className="grid aspect-video place-items-center rounded-2xl bg-black text-sm text-white/70">
              {saving ? "Saving the recording…" : live ? (hosting ? "Starting your camera…" : `Waiting for ${session.host.name}…`) : "This live has ended"}
            </div>
          ) : (
            tiles.map((tile, index) => (
              <Tile key={tile.key} tile={tile} soundOn={soundOn} featured={index === 0 && tiles.length > 2} />
            ))
          )}
        </div>
        {!soundOn && live && Object.keys(remotes).length > 0 ? (
          <div className="px-3 pb-2">
            <button type="button" onClick={() => setSoundOn(true)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">
              Tap to hear everyone
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9ec5ff]">{session.host.name} started this</p>
            <h1 className="truncate font-serif text-3xl">{session.title}</h1>
            <p className="text-sm text-white/60">
              {saving ? "Saving the recording…" : recording ? "Recording · saved for the circle when you end" : people.length ? `${people.length} in the room` : live ? "Connecting" : recordingUrl ? "Recording saved" : "Ended"}
            </p>
          </div>
          {live && !displaced ? (
            <>
              <button type="button" onClick={() => void toggleMic()} className="rounded-full bg-white/10 px-3 py-2 text-sm">{micOn ? "Mute" : "Speak"}</button>
              <button type="button" onClick={() => void toggleCam()} className="rounded-full bg-white/10 px-3 py-2 text-sm">{camOn ? "Hide camera" : "Show camera"}</button>
              <button type="button" onClick={() => void toggleScreen()} className="rounded-full bg-white/10 px-3 py-2 text-sm">{sharing ? "Stop sharing" : "Share screen"}</button>
              {hosting ? <button type="button" onClick={() => void endLive()} className="rounded-full bg-terra px-3 py-2 text-sm font-semibold">End live</button> : null}
            </>
          ) : null}
        </div>
        {live && !displaced ? (
          <p className="px-5 pb-4 text-sm text-white/70">
            {people.map((person) => person.name).filter(Boolean).join(", ") || "People show up here as they join."}
            {hosting ? "" : " Turn on your camera, mic, or screen whenever you want to be part of it."}
          </p>
        ) : null}
        {error ? <p className="px-5 pb-4 text-sm text-[#ffc9c2]">{error}</p> : null}
      </section>
      <aside className="flex h-[32rem] flex-col rounded-[1.75rem] border border-line bg-card lg:h-auto">
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? <p className="text-sm text-muted">Say hello when you're in.</p> : null}
          {messages.map((message) => (
            <p key={message.id} className="text-sm">
              <span className="font-semibold">{message.author.name}</span>{" "}
              <span className="text-muted">{timeAgo(message.createdAt)}</span>
              <span className="mt-0.5 block whitespace-pre-wrap break-words">{message.body}</span>
            </p>
          ))}
        </div>
        {live ? (
          <form onSubmit={sendChat} className="flex gap-2 border-t border-line p-3">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Message the room" className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-sm" />
            <button type="submit" className="text-sm font-semibold text-pine">Send</button>
          </form>
        ) : (
          <p className="border-t border-line p-4 text-sm text-muted">
            {saving ? "Saving the recording…" : recordingUrl ? "The recording is on this page and on the family page." : "This live has ended."}{" "}
            <Link href="/home" className="font-semibold text-ink">Back home</Link>
          </p>
        )}
      </aside>
    </div>
  );
}

type TileModel = { key: string; stream: MediaStream | null; name: string; local: boolean; showVideo: boolean };

function buildTiles({
  people,
  remotes,
  preview,
  selfId,
  hosting,
  camOn,
  sharing,
  micOn,
  userName,
}: {
  people: Person[];
  remotes: Record<string, MediaStream>;
  preview: MediaStream | null;
  selfId: string;
  hosting: boolean;
  camOn: boolean;
  sharing: boolean;
  micOn: boolean;
  userName: string;
}) {
  const tiles: TileModel[] = [];
  const host = people.find((person) => person.role === "host");
  const localTile: TileModel | null = preview
    ? { key: "you", stream: preview, name: `${userName} · you${micOn ? "" : " · muted"}`, local: true, showVideo: camOn || sharing }
    : null;

  if (hosting && localTile) tiles.push(localTile);
  else if (host) tiles.push(remotes[host.connId] ? tileFromRemote(host, remotes[host.connId]) : placeholder(host));

  for (const person of people) {
    if (person.connId === selfId || person.connId === host?.connId) continue;
    const stream = remotes[person.connId];
    tiles.push(stream ? tileFromRemote(person, stream) : placeholder(person));
  }
  if (!hosting && localTile) tiles.push(localTile);
  return tiles;
}

function placeholder(person: Person): TileModel {
  return { key: person.connId, stream: null, name: person.name || "Someone", local: false, showVideo: false };
}

function tileFromRemote(person: Person, stream: MediaStream): TileModel {
  const video = stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled && !track.muted);
  return { key: person.connId, stream, name: person.name || "Someone", local: false, showVideo: video };
}

function Tile({ tile, soundOn, featured }: { tile: TileModel; soundOn: boolean; featured: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.srcObject = tile.stream;
    if (tile.stream) void node.play().catch(() => undefined);
  }, [tile.stream, soundOn]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-black ${featured ? "sm:col-span-2" : ""}`}>
      <video ref={ref} autoPlay playsInline muted={tile.local || !soundOn} className={`aspect-video w-full object-cover ${tile.showVideo ? "" : "invisible absolute"}`} />
      {tile.showVideo ? null : (
        <div className="grid aspect-video place-items-center bg-[#221c18] text-lg">{tile.name.split("·")[0]}</div>
      )}
      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-xs">{tile.name}</span>
    </div>
  );
}
