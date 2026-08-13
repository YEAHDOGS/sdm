import { useEffect, useState } from "react";
import type { FeedItem } from "@help/shared";
import { FeedCard } from "./FeedCard";

const MOCK_FEED: FeedItem[] = [
  {
    streamId: "mock-1",
    missionId: "m-1",
    helper: { id: "u_helper", handle: "alexhelps", displayName: "Alex H." },
    routeTitle: "$10 pizza run — 5th St",
    zoneName: "5th St corridor",
    live: true,
    viewerCount: 214,
    tipTotalCents: 1250,
    startedAt: new Date().toISOString(),
  },
  {
    streamId: "mock-2",
    missionId: "m-2",
    helper: { id: "u2", handle: "priyadelivers", displayName: "Priya D." },
    routeTitle: "$10 pizza run — Riverside",
    zoneName: "Riverside underpass",
    live: false,
    viewerCount: 0,
    tipTotalCents: 4300,
  },
];

export function App() {
  const [items, setItems] = useState<FeedItem[]>(MOCK_FEED);

  useEffect(() => {
    fetch("/v1/feed")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { items: FeedItem[] }) => {
        if (data.items.length > 0) setItems(data.items);
      })
      .catch(() => {
        /* dev without API running: keep mock feed */
      });
  }, []);

  return (
    <main className="feed">
      {items.map((item) => (
        <FeedCard key={item.streamId} item={item} />
      ))}
    </main>
  );
}
