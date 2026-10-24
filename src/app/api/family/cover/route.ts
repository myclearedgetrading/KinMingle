import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import { findCover, writeCover } from "@/lib/cover";
import { assertSameOrigin, error, json } from "@/lib/http";
import { getAuth, managesCircle } from "@/lib/session";
import { classifyUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth?.active) return error("Join a circle first.", 401);
  const cover = await findCover(auth.active.family.id);
  if (!cover) return error("No cover yet.", 404);

  let size = 0;
  try {
    size = statSync(cover.full).size;
  } catch {
    return error("No cover yet.", 404);
  }

  const stream = createReadStream(cover.full);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": cover.mime,
      "Content-Length": String(size),
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth?.active) return error("Join a circle first.", 401);
  if (!managesCircle(auth)) return error("Only the circle owner can change the cover.", 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Choose a photo.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return error("Choose a photo.", 400);
  const classified = await classifyUpload(file);
  if (!classified.ok) return error(classified.error, 400);
  if (classified.file.kind !== "image") return error("The cover needs to be a photo.", 400);

  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[classified.file.mime];
  if (!ext) return error("The cover needs to be a JPEG, PNG, WebP, or GIF.", 400);
  await writeCover(auth.active.family.id, ext, classified.file.bytes);
  return json({ ok: true });
}
