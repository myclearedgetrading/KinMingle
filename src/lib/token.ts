import { SignJWT, jwtVerify } from "jose";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = { sub: string; name: string };

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.name !== "string") return null;
    if (payload.purpose === "ws") return null;
    return { sub: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

export async function signWsToken(payload: { sub: string; name: string; familyId: string }) {
  return new SignJWT({ name: payload.name, familyId: payload.familyId, purpose: "ws" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyWsToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "ws" || !payload.sub) return null;
    if (typeof payload.name !== "string" || typeof payload.familyId !== "string") return null;
    return { sub: payload.sub, name: payload.name, familyId: payload.familyId };
  } catch {
    return null;
  }
}
