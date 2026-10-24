import { randomBytes } from "crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeInviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function normalizeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
