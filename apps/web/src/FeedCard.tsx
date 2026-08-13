import { useEffect, useRef, useState } from "react";
import type { FeedItem, RoomServerMessage } from "@help/shared";

/**
 * One full-viewport card in the vertical feed. When it's the visible card and
 * the stream is live, it opens the StreamRoom WebSocket for chat/cheer/tips.
 * Video playback (LL-HLS / WHEP via Cloudflare Stream) mounts where the
 * placeholder div is — see ARCHITECTURE.md §5.
 */
export function FeedCard({ item }: { item: FeedItem }) {
  const [messages, setMessages] = useState<RoomServerMessage[]>([]);
  const [viewers, setViewers] = useState(item.viewerCount);
  const [draft, setDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!item.live) return;
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.intersectionRatio > 0.6) {
          if (!wsRef.current) {
            const proto = location.protocol === "https:" ? "wss" : "ws";
            const ws = new WebSocket(`${proto}://${location.host}/v1/streams/${item.streamId}/ws`);
            ws.onmessage = (e) => {
              const msg = JSON.parse(e.data) as RoomServerMessage;
              if (msg.type === "viewers") setViewers(msg.count);
              else setMessages((prev) => [...prev.slice(-49), msg]);
            };
            wsRef.current = ws;
          }
        } else {
          wsRef.current?.close();
          wsRef.current = null;
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(card);
    return () => {
      observer.disconnect();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [item.live, item.streamId]);

  const sendChat = () => {
    if (!draft.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat", text: draft }));
    setDraft("");
  };

  return (
    <section className="card" ref={cardRef}>
      <div className="video-placeholder">
        {item.live ? "🔴 LIVE" : "▶ replay"}
        {item.playbackUrl ? "" : " (stream player mounts here)"}
      </div>

      <header className="card-top">
        <span className="badge">{item.live ? `LIVE · ${viewers} watching` : "Replay"}</span>
        <span className="zone">{item.zoneName}</span>
      </header>

      <footer className="card-bottom">
        <div className="helper">
          <strong>@{item.helper.handle}</strong> — {item.routeTitle}
          <div className="tips">💛 {(item.tipTotalCents / 100).toFixed(2)} tipped</div>
        </div>

        {item.live && (
          <>
            <ul className="chat">
              {messages.map((m, i) => (
                <li key={i}>
                  {m.type === "chat" && (
                    <>
                      <b>{m.name}:</b> {m.text}
                    </>
                  )}
                  {m.type === "tip" && (
                    <em>
                      💸 {m.name} tipped ${(m.amountCents / 100).toFixed(2)}!
                    </em>
                  )}
                  {m.type === "cheer" && <span>{m.emoji}</span>}
                  {m.type === "system" && <em>{m.text}</em>}
                </li>
              ))}
            </ul>
            <div className="chat-input">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Say something kind…"
              />
              <button onClick={sendChat}>Send</button>
              <button
                onClick={() =>
                  wsRef.current?.send(JSON.stringify({ type: "cheer", emoji: "🎉" }))
                }
              >
                🎉
              </button>
            </div>
          </>
        )}
      </footer>
    </section>
  );
}
