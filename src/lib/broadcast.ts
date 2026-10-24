export async function broadcast(event: Record<string, unknown>) {
  const secret = process.env.REALTIME_SECRET;
  if (!secret) return;
  const port = process.env.REALTIME_PORT || "3001";
  try {
    await fetch(`http://127.0.0.1:${port}/internal/broadcast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-realtime-secret": secret,
      },
      body: JSON.stringify(event),
    });
  } catch {
    // Posts still save when the live server is down. The feed refreshes on the next visit.
  }
}
