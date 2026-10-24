import { broadcast } from "@/lib/broadcast";
import { prisma } from "@/lib/db";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth, membershipFor } from "@/lib/session";
import { removeUpload, writeUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECORDING = 250 * 1024 * 1024;

function looksLikeVideo(bytes: Buffer, mime: string) {
  if (mime === "video/webm") return bytes.length > 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mime === "video/mp4") return bytes.length > 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const session = await prisma.liveSession.findUnique({ where: { id } });
  if (!session) return error("That stream doesn't exist.", 404);
  const member = await membershipFor(auth.user.id, session.familyId);
  if (!member) return error("That stream doesn't exist.", 404);
  if (session.hostId !== auth.user.id) return error("Only the host can save this recording.", 403);

  const existing = await prisma.media.findFirst({
    where: { postId: session.postId, name: { startsWith: "live-recording" } },
  });
  if (existing) return json({ ok: true, already: true, url: `/api/media/${existing.id}` });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("The recording didn't arrive.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) return error("The recording was empty.");
  if (file.size > MAX_RECORDING) return error("That recording is over 250 MB. End a long live sooner so it can be saved.");

  const mime = (file.type || "video/webm").split(";")[0].toLowerCase();
  if (mime !== "video/webm" && mime !== "video/mp4") return error("The recording needs to be a video.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeVideo(bytes, mime)) return error("That file doesn't look like a recording.");

  const ext = mime === "video/mp4" ? "mp4" : "webm";
  const name = `live-recording.${ext}`;
  let storageKey = "";
  try {
    storageKey = await writeUpload(session.familyId, { kind: "video", mime, name, size: bytes.length, bytes });
    const media = await prisma.media.create({
      data: { postId: session.postId, kind: "video", mime, name, size: bytes.length, storageKey },
    });
    await broadcast({ type: "post:updated", familyId: session.familyId, postId: session.postId });
    return json({ ok: true, url: `/api/media/${media.id}` });
  } catch (err) {
    if (storageKey) await removeUpload(storageKey);
    console.error(err);
    return error("The recording didn't save.", 500);
  }
}
