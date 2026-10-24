import { broadcast } from "@/lib/broadcast";
import { getFeed, getPublicFeed, postInclude, serializePost } from "@/lib/feed";
import { assertSameOrigin, error, json } from "@/lib/http";
import { LIMITS } from "@/lib/limits";
import { notifyCircle } from "@/lib/notify";
import { getAuth } from "@/lib/session";
import { classifyUpload, removeUpload, writeUpload } from "@/lib/storage";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);
  const url = new URL(req.url);
  const opts = {
    cursor: url.searchParams.get("cursor"),
    kind: url.searchParams.get("kind") || "all",
    q: url.searchParams.get("q")?.trim() || "",
    authorId: url.searchParams.get("authorId") || undefined,
  };
  if (url.searchParams.get("scope") === "public") return json(await getPublicFeed(opts));
  const requested = url.searchParams.get("familyId");
  const familyId = requested || auth.active?.family.id;
  if (!familyId) return error("Join a circle first.", 401);
  const member = auth.memberships.some((item) => item.family.id === familyId);
  if (!member) return error("You aren't in that circle.", 403);
  return json(await getFeed(familyId, opts));
}

export async function POST(req: Request) {
  const blocked = assertSameOrigin(req);
  if (blocked) return blocked;
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Send the update as a file upload.");
  }
  const destination = String(form.get("destination") || "circle");
  const requestedFamily = String(form.get("familyId") || auth.active?.family.id || "");
  const circle = auth.memberships.find((item) => item.family.id === requestedFamily);
  if (destination !== "public" && !circle) return error("Join a circle first.", 401);
  const visibility = destination === "public" ? "public" : "circle";
  const familyId = visibility === "public" ? null : circle!.family.id;
  const body = String(form.get("body") || "").trim();
  if (body.length > LIMITS.body) return error("That update is too long.");
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (!body && files.length === 0) return error("Write something or attach a file.");
  if (files.length > LIMITS.maxFiles) return error(`You can attach up to ${LIMITS.maxFiles} files.`);

  const ready: { kind: string; mime: string; name: string; size: number; storageKey: string }[] = [];
  try {
    for (const file of files) {
      const classified = await classifyUpload(file);
      if (!classified.ok) {
        await Promise.all(ready.map((item) => removeUpload(item.storageKey)));
        return error(classified.error);
      }
      const storageKey = await writeUpload(familyId || "public", classified.file);
      ready.push({
        kind: classified.file.kind,
        mime: classified.file.mime,
        name: classified.file.name,
        size: classified.file.size,
        storageKey,
      });
    }

    const post = await prisma.post.create({
      data: {
        body,
        visibility,
        authorId: auth.user.id,
        familyId,
        media: { create: ready },
      },
      include: postInclude,
    });
    if (familyId) {
      await broadcast({ type: "post:new", familyId, postId: post.id });
      await notifyCircle(familyId, auth.user.id, "circle-post", post.id);
    }
    return json({ post: serializePost(post) });
  } catch (err) {
    await Promise.all(ready.map((item) => removeUpload(item.storageKey)));
    console.error(err);
    return error("The upload didn't finish.", 500);
  }
}
