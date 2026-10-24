import { createReadStream } from "fs";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { findAvatar, writeAvatar } from "@/lib/profile-media";
import { assertSameOrigin, error } from "@/lib/http";
import { getAuth } from "@/lib/session";
import { classifyUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  const person = await prisma.user.findUnique({ where: { id }, select: { hasAvatar: true } });
  if (!person?.hasAvatar) return error("No photo yet.", 404);
  const file = await findAvatar(id);
  if (!file) return error("No photo yet.", 404);
  const stream = createReadStream(file.full);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const { id } = await ctx.params;
  if (id !== auth.user.id) return error("You can only change your own photo.", 403);
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
  await writeAvatar(id, ext, classified.file.bytes);
  await prisma.user.update({ where: { id }, data: { hasAvatar: true } });
  return Response.json({ ok: true });
}
