type Slot = {
  id: string;
  label: string;
  video: HTMLVideoElement;
  audio?: MediaStreamAudioSourceNode;
  stream: MediaStream;
};

export type RecordedStream = { id: string; label: string; stream: MediaStream | null };

const MIME_CANDIDATES = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];

export class RoomRecorder {
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private audio = new AudioContext();
  private dest = this.audio.createMediaStreamDestination();
  private slots = new Map<string, Slot>();
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timer = 0;
  private mime = "video/webm";
  private closed = false;

  constructor() {
    this.canvas.width = 1280;
    this.canvas.height = 720;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Could not record this live.");
    this.ctx = ctx;
  }

  async start() {
    if (typeof MediaRecorder === "undefined") throw new Error("This browser can't save a recording.");
    await this.audio.resume();
    const picture = this.canvas.captureStream(12);
    const mixed = new MediaStream([...picture.getVideoTracks(), ...this.dest.stream.getAudioTracks()]);
    this.mime = MIME_CANDIDATES.find((item) => MediaRecorder.isTypeSupported(item)) || "";
    this.recorder = new MediaRecorder(
      mixed,
      this.mime
        ? { mimeType: this.mime, videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 }
        : { videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 },
    );
    this.recorder.ondataavailable = (event) => {
      if (event.data.size) this.chunks.push(event.data);
    };
    this.recorder.start(1000);
    this.timer = window.setInterval(() => this.draw(), 120);
    this.draw();
  }

  setStreams(items: RecordedStream[]) {
    if (this.closed) return;
    const keep = new Set(items.map((item) => item.id));
    for (const [id, slot] of this.slots) {
      if (!keep.has(id)) this.drop(id, slot);
    }
    for (const item of items) {
      if (!item.stream) continue;
      const current = this.slots.get(item.id);
      if (current && current.stream === item.stream) {
        current.label = item.label;
        continue;
      }
      if (current) this.drop(item.id, current);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = item.stream;
      void video.play().catch(() => undefined);
      const slot: Slot = { id: item.id, label: item.label, video, stream: item.stream };
      this.attachAudio(slot, item.stream);
      this.slots.set(item.id, slot);
    }
  }

  async stop() {
    if (this.closed) return null;
    this.closed = true;
    window.clearInterval(this.timer);
    const recorder = this.recorder;
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(this.blob());
        return;
      }
      recorder.onstop = () => resolve(this.blob());
      try {
        recorder.stop();
      } catch {
        resolve(this.blob());
      }
    });
    this.release();
    return blob;
  }

  discard() {
    this.closed = true;
    window.clearInterval(this.timer);
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      // The recorder is already stopped.
    }
    this.chunks = [];
    this.release();
  }

  private blob() {
    if (!this.chunks.length) return null;
    const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || this.mime || "video/webm" });
    return blob.size > 1000 ? blob : null;
  }

  private attachAudio(slot: Slot, stream: MediaStream) {
    const tracks = stream.getAudioTracks().filter((track) => track.readyState === "live");
    if (!tracks.length || this.audio.state === "closed") return;
    const source = this.audio.createMediaStreamSource(new MediaStream(tracks));
    source.connect(this.dest);
    slot.audio = source;
  }

  private drop(id: string, slot: Slot) {
    slot.audio?.disconnect();
    slot.video.srcObject = null;
    this.slots.delete(id);
  }

  private release() {
    for (const [id, slot] of this.slots) this.drop(id, slot);
    void this.audio.close().catch(() => undefined);
  }

  private draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    ctx.fillStyle = "#071B4D";
    ctx.fillRect(0, 0, width, height);
    const slots = [...this.slots.values()];
    if (!slots.length) {
      ctx.fillStyle = "#F2F7FF";
      ctx.font = "32px sans-serif";
      ctx.fillText("KinMingle", 48, height / 2);
      return;
    }
    const cols = slots.length === 1 ? 1 : 2;
    const rows = Math.ceil(slots.length / cols);
    const gap = 16;
    const tileW = (width - gap * (cols + 1)) / cols;
    const tileH = (height - gap * (rows + 1)) / rows;
    slots.forEach((slot, index) => {
      const column = index % cols;
      const row = Math.floor(index / cols);
      const x = gap + column * (tileW + gap);
      const y = gap + row * (tileH + gap);
      ctx.fillStyle = "#0c2a70";
      ctx.fillRect(x, y, tileW, tileH);
      const video = slot.video;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.max(tileW / video.videoWidth, tileH / video.videoHeight);
        const drawnW = video.videoWidth * scale;
        const drawnH = video.videoHeight * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, tileW, tileH);
        ctx.clip();
        ctx.drawImage(video, x + (tileW - drawnW) / 2, y + (tileH - drawnH) / 2, drawnW, drawnH);
        ctx.restore();
      }
      ctx.fillStyle = "rgba(7, 27, 77, 0.72)";
      ctx.fillRect(x, y + tileH - 42, tileW, 42);
      ctx.fillStyle = "#F2F7FF";
      ctx.font = "22px sans-serif";
      ctx.fillText(slot.label.slice(0, 42), x + 14, y + tileH - 14);
    });
  }
}
