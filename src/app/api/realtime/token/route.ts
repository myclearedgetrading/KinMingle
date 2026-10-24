import { error, json } from "@/lib/http";
import { membershipFor, getAuth } from "@/lib/session";
import { signWsToken } from "@/lib/token";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return error("Sign in first.", 401);

  const requested = new URL(req.url).searchParams.get("familyId");
  const familyId = requested || auth.active?.family.id;
  if (!familyId) return error("Join a circle first.");
  const membership = await membershipFor(auth.user.id, familyId);
  if (!membership) return error("You aren't in that circle.", 403);

  const token = await signWsToken({
    sub: auth.user.id,
    name: auth.user.name,
    familyId,
  });
  const host = req.headers.get("host")?.split(":")[0] || "localhost";
  const forwarded = req.headers.get("x-forwarded-proto");
  const wsProto = forwarded === "https" ? "wss" : "ws";
  const port = process.env.REALTIME_PORT || "3001";
  const url = process.env.REALTIME_PUBLIC_URL || `${wsProto}://${host}:${port}`;
  return json({ token, url });
}
