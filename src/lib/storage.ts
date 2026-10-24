import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { LIMITS } from "./limits";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
]);
const FILE_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/json",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov"]);
const AUDIO_EXT = new Set(["webm", "weba", "mp3", "wav", "ogg", "m4a", "aac"]);
const FILE_EXT = new Set(["pdf", "txt", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "rtf", "json"]);
const BLOCKED = new Set(["exe", "bat", "cmd", "com", "msi", "scr", "ps1", "vbs", "js", "jar", "dll", "sh", "html", "htm", "svg"]);

export type StoredFile = {
  kind: "image" | "video" | "audio" | "file";
  mime: string;
  name: string;
  size: number;
  bytes: Buffer;
};

function extension(name: string) {
  const part = name.split(".").pop()?.toLowerCase() || "";
  return part.length < 8 ? part : "";
}

function safeName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80);
  return cleaned || "file";
}

function looksLikeImage(buf: Buffer, mime: string) {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === "image/png") return buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/gif") {
    const head = buf.subarray(0, 6).toString("ascii");
    return head === "GIF87a" || head === "GIF89a";
  }
  if (mime === "image/webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function guessMime(ext: string, kind: StoredFile["kind"]) {
  if (kind === "image") return ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";
  if (kind === "video") return ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
  if (kind === "audio") return ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : ext === "m4a" ? "audio/mp4" : "audio/webm";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "json") return "application/json";
  if (ext === "zip") return "application/zip";
  return "application/octet-stream";
}

export async function classifyUpload(file: File): Promise<{ ok: true; file: StoredFile } | { ok: false; error: string }> {
  const name = (file.name || "upload").slice(0, 120);
  const ext = extension(name);
  if (BLOCKED.has(ext)) return { ok: false, error: `${name} isn't a kind of file Papis will keep.` };
  if (file.size <= 0) return { ok: false, error: `${name} is empty.` };

  const mime = (file.type || "application/octet-stream").split(";")[0].toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  const voice = name.startsWith("voice-note");
  let kind: StoredFile["kind"] | null = null;

  if (!voice && (IMAGE_MIMES.has(mime) || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext))) {
    if (file.size > LIMITS.image) return { ok: false, error: `${name} is over 20 MB.` };
    const imageMime = IMAGE_MIMES.has(mime) ? mime : guessMime(ext, "image");
    if (!looksLikeImage(bytes, imageMime)) return { ok: false, error: `${name} doesn't look like a valid image.` };
    kind = "image";
  } else if (voice || AUDIO_MIMES.has(mime) || (AUDIO_EXT.has(ext) && !VIDEO_MIMES.has(mime))) {
    if (file.size > LIMITS.audio) return { ok: false, error: `${name} is over 30 MB.` };
    kind = "audio";
  } else if (VIDEO_MIMES.has(mime) || VIDEO_EXT.has(ext)) {
    if (file.size > LIMITS.video) return { ok: false, error: `${name} is over 100 MB.` };
    kind = "video";
  } else if (FILE_MIMES.has(mime) || FILE_EXT.has(ext)) {
    if (file.size > LIMITS.file) return { ok: false, error: `${name} is over 50 MB.` };
    kind = "file";
  }

  if (!kind) return { ok: false, error: `${name} isn't a file type Papis accepts.` };

  return {
    ok: true,
    file: {
      kind,
      mime: mime === "application/octet-stream" ? guessMime(ext, kind) : mime,
      name,
      size: file.size,
      bytes,
    },
  };
}

export function resolveUpload(storageKey: string) {
  const root = path.resolve(process.cwd(), "data", "uploads");
  const full = path.resolve(root, storageKey);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Bad storage path");
  return full;
}

export async function writeUpload(familyId: string, file: StoredFile) {
  const storageKey = `${familyId}/${randomBytes(8).toString("hex")}-${safeName(file.name)}`;
  const full = resolveUpload(storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, file.bytes);
  return storageKey;
}

export async function removeUpload(storageKey: string) {
  try {
    await unlink(resolveUpload(storageKey));
  } catch {
    // The database row is the source of truth if the file is already gone.
  }
}
