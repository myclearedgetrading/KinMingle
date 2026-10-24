import { createReadStream } from "fs";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { findProfileCover, writeProfileCover } from "@/lib/profile-media";
import { assertSameOrigin, error } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { classifyUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const person = await prisma.user.findUnique({ where: { id }, select: { hasCover: true } });
  if (!person?.hasCover) return error("No cover yet.", 404);
  const file = await findProfileCover(id);
  if (!file) return error("No cover yet.", 404);
  const stream = createReadStream(file.full);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  if (id !== auth.user.id) return error("You can only change your own cover.", 403);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Send a photo.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return error("Choose a photo.");
  const classified = await classifyUpload(file);
  if (!classified.ok || classified.file.kind !== "image") return error("Use a photo.");
  const ext = classified.file.mime === "image/png" ? "png" : classified.file.mime === "image/webp" ? "webp" : classified.file.mime === "image/gif" ? "gif" : "jpg";
  await writeProfileCover(id, ext, classified.file.bytes);
  await prisma.user.update({ where: { id }, data: { hasCover: true } });
  return Response.json({ ok: true });
}
