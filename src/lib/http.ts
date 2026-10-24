import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function fromZod(issue: ZodError) {
  return error(issue.issues[0]?.message || "Check the form and try again.");
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host !== host) return error("That request came from somewhere else.", 403);
  } catch {
    return error("That request came from somewhere else.", 403);
  }
  return null;
}
