import { access, unlink, writeFile, mkdir } from "fs/promises";
import { resolveUpload } from "@/lib/storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function assertFamilyId(familyId: string) {
  if (!/^[a-z0-9]+$/i.test(familyId)) throw new Error("Bad family");
  return familyId;
}

export async function findCover(familyId: string) {
  const id = assertFamilyId(familyId);
  for (const ext of Object.keys(MIME)) {
    const key = `covers/${id}.${ext}`;
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

export async function writeCover(familyId: string, ext: string, bytes: Buffer) {
  const id = assertFamilyId(familyId);
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  if (!MIME[safeExt]) throw new Error("Bad cover type");
  await mkdir(resolveUpload("covers"), { recursive: true });
  await Promise.all(
    Object.keys(MIME).map(async (item) => {
      try {
        await unlink(resolveUpload(`covers/${id}.${item}`));
      } catch {
        // No previous file of this type.
      }
    }),
  );
  const key = `covers/${id}.${safeExt}`;
  await writeFile(resolveUpload(key), bytes);
  return key;
}
