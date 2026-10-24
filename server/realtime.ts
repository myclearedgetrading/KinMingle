import "dotenv/config";
import { createServer, type IncomingMessage } from "http";
import { randomUUID, timingSafeEqual } from "crypto";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { prisma, ready } from "../src/lib/db";
import { verifyWsToken } from "../src/lib/token";

type Role = "host" | "viewer";

type Client = {
  ws: WebSocket;
  connId: string;
  authed: boolean;
  userId?: string;
  name?: string;
  familyId?: string;
  sessionId?: string;
  role?: Role;
};

const families = new Map<string, Set<Client>>();
const rooms = new Map<string, Set<Client>>();
const hostTimers = new Map<string, NodeJS.Timeout>();
const ALLOWED = new Set(["post:new", "post:updated", "post:deleted", "live:started", "live:ended", "chat:new"]);

function send(client: Client, payload: unknown) {
  if (client.ws.readyState === WebSocket.OPEN) client.ws.send(JSON.stringify(payload));
}

function sendFamily(familyId: string, payload: unknown) {
  const data = JSON.stringify(payload);
  families.get(familyId)?.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(data);
  });
}

function secretOk(header: string | undefined) {
  const expected = process.env.REALTIME_SECRET || "";
  const given = header || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (!a.length || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function presenceList(familyId: string) {
  const users = new Map<string, { id: string; name: string }>();
  families.get(familyId)?.forEach((client) => {
    if (client.userId && client.name) users.set(client.userId, { id: client.userId, name: client.name });
  });
  return [...users.values()];
}

function broadcastPresence(familyId: string) {
  sendFamily(familyId, { type: "presence", users: presenceList(familyId) });
}

async function liveSnapshot(familyId: string) {
  const rows = await prisma.liveSession.findMany({
    where: { familyId, status: "live" },
    include: { host: { select: { id: true, name: true } } },
    orderBy: { startedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    hostId: row.host.id,
    hostName: row.host.name,
    viewerCount: viewerCount(row.id),
  }));
}

function viewerCount(sessionId: string) {
  const ids = new Set<string>();
  rooms.get(sessionId)?.forEach((client) => {
    if (client.role === "viewer" && client.userId) ids.add(client.userId);
  });
  return ids.size;
}

function emitRoom(sessionId: string) {
  const room = rooms.get(sessionId);
  if (!room?.size) return;
  const participants = [...room]
    .filter((client) => client.role)
    .map((client) => ({ connId: client.connId, userId: client.userId, name: client.name, role: client.role }));
  const host = participants.find((person) => person.role === "host");
  const viewers = participants.filter((person) => person.role === "viewer");
  const familyId = [...room][0]?.familyId;
  room.forEach((client) => {
    send(client, {
      type: "room",
      sessionId,
      hostConnId: host?.connId ?? null,
      selfConnId: client.connId,
      viewers,
      participants,
    });
  });
  if (familyId) {
    sendFamily(familyId, { type: "live:viewers", familyId, sessionId, viewerCount: viewerCount(sessionId) });
  }
}

async function rememberPeak(sessionId: string) {
  const count = viewerCount(sessionId);
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (session && count > session.peakViewers) {
    await prisma.liveSession.update({ where: { id: sessionId }, data: { peakViewers: count } });
  }
}

async function endSession(sessionId: string, familyId: string) {
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "live") return;
  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedAt: new Date() },
  });
  const room = rooms.get(sessionId);
  room?.forEach((client) => {
    send(client, { type: "live-ended", sessionId });
    client.role = undefined;
    client.sessionId = undefined;
  });
  rooms.delete(sessionId);
  clearTimeout(hostTimers.get(sessionId));
  hostTimers.delete(sessionId);
  sendFamily(familyId, { type: "live:ended", familyId, sessionId });
  sendFamily(familyId, { type: "post:updated", familyId, postId: session.postId });
}

function armHostTimeout(sessionId: string, familyId: string) {
  clearTimeout(hostTimers.get(sessionId));
  hostTimers.set(
    sessionId,
    setTimeout(() => {
      const hostThere = [...(rooms.get(sessionId) ?? [])].some((client) => client.role === "host");
      if (!hostThere) void endSession(sessionId, familyId);
    }, 45_000),
  );
}

function leaveRoom(client: Client) {
  if (!client.sessionId) return;
  const sessionId = client.sessionId;
  const familyId = client.familyId;
  const wasHost = client.role === "host";
  const room = rooms.get(sessionId);
  room?.delete(client);
  client.sessionId = undefined;
  client.role = undefined;
  if (!room?.size) rooms.delete(sessionId);
  else emitRoom(sessionId);
  if (wasHost && familyId && ![...(rooms.get(sessionId) ?? [])].some((item) => item.role === "host")) {
    armHostTimeout(sessionId, familyId);
  }
}

async function joinLive(client: Client, sessionId: string) {
  if (!client.familyId || !client.userId) return;
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session || session.familyId !== client.familyId) {
    send(client, { type: "error", message: "That live room is not in this circle." });
    return;
  }
  if (session.status !== "live") {
    send(client, { type: "error", message: "That stream has ended." });
    return;
  }

  leaveRoom(client);
  client.sessionId = sessionId;
  const role: Role = session.hostId === client.userId ? "host" : "viewer";
  if (role === "host") {
    rooms.get(sessionId)?.forEach((other) => {
      if (other.role === "host" && other !== client) {
        other.role = undefined;
        send(other, { type: "host-replaced" });
      }
    });
    clearTimeout(hostTimers.get(sessionId));
  }
  client.role = role;
  const room = rooms.get(sessionId) ?? new Set<Client>();
  room.add(client);
  rooms.set(sessionId, room);
  emitRoom(sessionId);
  await rememberPeak(sessionId);
}

function relaySignal(client: Client, to: string, data: unknown) {
  if (!client.sessionId || !client.role) return;
  const target = [...(rooms.get(client.sessionId) ?? [])].find((item) => item.connId === to && item.role);
  if (!target || target === client) return;
  send(target, { type: "signal", from: client.connId, data });
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
}

function header(req: IncomingMessage, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/internal/broadcast") {
    if (!secretOk(header(req, "x-realtime-secret"))) {
      res.writeHead(401).end();
      return;
    }
    try {
      const event = await readBody(req);
      const type = String(event.type || "");
      const familyId = String(event.familyId || "");
      if (!ALLOWED.has(type) || !familyId) {
        res.writeHead(400).end();
        return;
      }
      if (type === "live:ended") {
        const sessionId = String(event.sessionId || "");
        rooms.get(sessionId)?.forEach((client) => {
          send(client, { type: "live-ended", sessionId });
          client.role = undefined;
          client.sessionId = undefined;
        });
        rooms.delete(sessionId);
        clearTimeout(hostTimers.get(sessionId));
      }
      sendFamily(familyId, event);
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const client: Client = { ws, connId: randomUUID(), authed: false };
  const authTimer = setTimeout(() => {
    if (!client.authed) ws.close(4001, "auth");
  }, 8000);

  ws.on("message", async (raw: RawData) => {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    if (!client.authed) {
      if (message.type !== "auth" || typeof message.token !== "string") {
        ws.close(4001, "auth");
        return;
      }
      const payload = await verifyWsToken(message.token);
      if (!payload) {
        ws.close(4001, "auth");
        return;
      }
      clearTimeout(authTimer);
      client.authed = true;
      client.userId = payload.sub;
      client.name = payload.name;
      client.familyId = payload.familyId;
      const set = families.get(payload.familyId) ?? new Set<Client>();
      set.add(client);
      families.set(payload.familyId, set);
      send(client, { type: "authed", presence: presenceList(payload.familyId), live: await liveSnapshot(payload.familyId) });
      broadcastPresence(payload.familyId);
      return;
    }

    if (message.type === "ping") {
      send(client, { type: "pong" });
      return;
    }
    if (message.type === "join-live") {
      await joinLive(client, String(message.sessionId || ""));
      return;
    }
    if (message.type === "leave-live") {
      leaveRoom(client);
      return;
    }
    if (message.type === "signal") {
      relaySignal(client, String(message.to || ""), message.data);
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimer);
    leaveRoom(client);
    if (client.familyId) {
      families.get(client.familyId)?.delete(client);
      broadcastPresence(client.familyId);
    }
  });
});

const port = Number(process.env.REALTIME_PORT || 3001);

async function main() {
  await ready();
  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000);
  await prisma.liveSession.updateMany({
    where: { status: "live", startedAt: { lt: cutoff } },
    data: { status: "ended", endedAt: new Date() },
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Papis live server listening on ${port}`);
  });
}

void main();
