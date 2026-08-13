import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Vertical feed shell — the TikTok-style pager. Each item is one full-screen
 * helper stream. Next steps (see ARCHITECTURE.md §5 & §7):
 *  - fetch /v1/feed instead of MOCK_FEED (shapes match @help/shared FeedItem;
 *    types are mirrored locally until the monorepo/Metro story is settled)
 *  - mount Cloudflare Stream playback (LL-HLS via expo-video, WHEP for focused)
 *  - WebSocket to /v1/streams/:id/ws for chat/cheers/tips on the focused card
 *  - helper mode: mission list → claim → checkpoint flow (camera + GPS) → go
 *    live via WHIP (react-native-webrtc)
 */

interface FeedItem {
  streamId: string;
  helperHandle: string;
  routeTitle: string;
  zoneName: string;
  live: boolean;
  viewerCount: number;
  tipTotalCents: number;
}

const MOCK_FEED: FeedItem[] = [
  {
    streamId: "mock-1",
    helperHandle: "alexhelps",
    routeTitle: "$10 pizza run — 5th St",
    zoneName: "5th St corridor",
    live: true,
    viewerCount: 214,
    tipTotalCents: 1250,
  },
  {
    streamId: "mock-2",
    helperHandle: "priyadelivers",
    routeTitle: "$10 pizza run — Riverside",
    zoneName: "Riverside underpass",
    live: false,
    viewerCount: 0,
    tipTotalCents: 4300,
  },
];

const { height } = Dimensions.get("window");

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.videoPlaceholder}>
        <Text style={styles.placeholderText}>
          {item.live ? "🔴 LIVE" : "▶ replay"} — stream player mounts here
        </Text>
      </View>
      <View style={styles.topRow}>
        <Text style={styles.badge}>
          {item.live ? `LIVE · ${item.viewerCount} watching` : "Replay"}
        </Text>
        <Text style={styles.zone}>{item.zoneName}</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.handle}>@{item.helperHandle}</Text>
        <Text style={styles.title}>{item.routeTitle}</Text>
        <Text style={styles.tips}>💛 ${(item.tipTotalCents / 100).toFixed(2)} tipped</Text>
        {item.live && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action}>
              <Text style={styles.actionText}>🎉 Cheer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action}>
              <Text style={styles.actionText}>💸 Tip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  const [feed] = useState(MOCK_FEED);
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={feed}
        keyExtractor={(item) => item.streamId}
        renderItem={({ item }) => <FeedCard item={item} />}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  card: { height, justifyContent: "space-between" },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#16213e",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#888", fontSize: 13 },
  topRow: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 60 },
  badge: {
    backgroundColor: "#e94560",
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  zone: { color: "#fff", opacity: 0.8, fontSize: 12, marginLeft: 8 },
  bottom: { padding: 16, paddingBottom: 48 },
  handle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  title: { color: "#fff", fontSize: 14, marginTop: 2 },
  tips: { color: "#fff", opacity: 0.9, fontSize: 13, marginTop: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  action: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: { color: "#fff", fontSize: 14 },
});
