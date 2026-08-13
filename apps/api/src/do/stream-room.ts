import type { RoomServerMessage } from "@help/shared";
import type { Env } from "../env";

interface Attachment {
  userId: string;
  name: string;
  lastChatTs: number;
}

/**
 * One StreamRoom per live stream: holds every viewer's WebSocket (hibernation
 * API, so idle rooms are ~free), broadcasts chat/cheers/tips, and owns the
 * authoritative viewer count.
 *
 * Clients connect via GET /v1/streams/:id/ws (the Worker forwards here).
 * The API pokes /event for server-originated messages (e.g. a paid tip).
 */
export class StreamRoom implements DurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ws")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.state.acceptWebSocket(server);
      server.serializeAttachment({
        userId: url.searchParams.get("userId") ?? "anon",
        name: url.searchParams.get("name") ?? "anon",
        lastChatTs: 0,
      } satisfies Attachment);
      this.broadcastViewers();
      return new Response(null, { status: 101, webSocket: client });
    }

    // Server-originated events (tips confirmed by the payments webhook, system notices).
    if (url.pathname.endsWith("/event") && request.method === "POST") {
      const msg = (await request.json()) as RoomServerMessage;
      this.broadcast(msg);
      return Response.json({ ok: true });
    }

    if (url.pathname.endsWith("/stats")) {
      return Response.json({ viewers: this.state.getWebSockets().length });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || raw.length > 500) return;
    const att = ws.deserializeAttachment() as Attachment;

    let msg: { type?: string; text?: string; emoji?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const ts = Date.now();

    if (msg.type === "chat" && typeof msg.text === "string" && msg.text.trim()) {
      if (ts - att.lastChatTs < 1000) return; // 1 msg/sec per socket
      ws.serializeAttachment({ ...att, lastChatTs: ts });
      this.broadcast({
        type: "chat",
        userId: att.userId,
        name: att.name,
        text: msg.text.slice(0, 300),
        ts,
      });
    } else if (msg.type === "cheer" && typeof msg.emoji === "string") {
      this.broadcast({ type: "cheer", userId: att.userId, emoji: msg.emoji.slice(0, 8), ts });
    }
  }

  async webSocketClose(): Promise<void> {
    this.broadcastViewers();
  }

  private broadcastViewers(): void {
    this.broadcast({ type: "viewers", count: this.state.getWebSockets().length });
  }

  private broadcast(msg: RoomServerMessage): void {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // socket already gone; hibernation API cleans it up
      }
    }
    // TODO(events): batch-flush chat/tip events to D1 stream_events for VOD replay.
  }
}
