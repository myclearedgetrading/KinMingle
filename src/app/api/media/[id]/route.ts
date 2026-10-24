import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { error } from "@/lib/http";
import { canSeePost } from "@/lib/access";
import { getAuth } from "@/lib/session";
import { resolveUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const media = await prisma.media.findUnique({
    where: { id },
    include: { post: { select: { familyId: true, visibility: true } } },
  });
  if (!media || !canSeePost(auth, media.post)) return error("File not found.", 404);

  let full: string;
  try {
    full = resolveUpload(media.storageKey);
  } catch {
    return error("File not found.", 404);
  }

  let size = 0;
  try {
    size = statSync(full).size;
  } catch {
    return error("File not found.", 404);
  }

  const ascii = media.name.replace(/[^\x20-\x7E]/g, "_");
  const disposition = `${media.kind === "file" ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(media.name)}`;
  const headers = new Headers({
    "Content-Type": media.mime || "application/octet-stream",
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = createReadStream(full, { start, end });
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }

  const stream = createReadStream(full);
  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(stream) as ReadableStream, { status: 200, headers });
}
