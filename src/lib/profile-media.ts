import { access, mkdir, unlink, writeFile } from "fs/promises";
import { resolveUpload } from "@/lib/storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function assertUserId(userId: string) {
  if (!/^[a-z0-9]+$/i.test(userId)) throw new Error("Bad profile");
  return userId;
}

async function findIn(folder: "avatars" | "profile-covers", userId: string) {
  const id = assertUserId(userId);
  for (const ext of Object.keys(MIME)) {
    const key = `${folder}/${id}.${ext}`;
    try {
      const full = resolveUpload(key);
      await access(full);
      return { full, mime: MIME[ext], key };
    } catch {
      // Try the next extension.
    }
  }
  return null;
}

async function writeIn(folder: "avatars" | "profile-covers", userId: string, ext: string, bytes: Buffer) {
  const id = assertUserId(userId);
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  if (!MIME[safeExt]) throw new Error("Bad image type");
  await mkdir(resolveUpload(folder), { recursive: true });
  await Promise.all(
    Object.keys(MIME).map(async (item) => {
      try {
        await unlink(resolveUpload(`${folder}/${id}.${item}`));
      } catch {
        // No previous file of this type.
      }
    }),
  );
  const key = `${folder}/${id}.${safeExt}`;
  await writeFile(resolveUpload(key), bytes);
  return key;
}

export const findAvatar = (userId: string) => findIn("avatars", userId);
export const writeAvatar = (userId: string, ext: string, bytes: Buffer) => writeIn("avatars", userId, ext, bytes);
export const findProfileCover = (userId: string) => findIn("profile-covers", userId);
export const writeProfileCover = (userId: string, ext: string, bytes: Buffer) => writeIn("profile-covers", userId, ext, bytes);
