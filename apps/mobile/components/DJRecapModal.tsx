import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, shadows, spacing, tapMin, typography } from "../theme/tokens";
import { apiFetch, ApiError } from "../lib/api";

// DJ 월말 리캡 모달 (mobile). 웹 src/components/dj/DJRecapModal.tsx 의 네이티브 포팅.

type Song = {
  key: string;
  title: string;
  linkImage: string | null;
  videoId: string | null;
  plays: number;
  firstSubmitter: string | null;
};

type Submitter = {
  id: string | null;
  name: string;
  plays: number;
  uniqueSongs: number;
};

type RecapData = {
  period: { from: string; to: string; label: string };
  totals: {
    plays: number;
    uniqueSongs: number;
    uniqueSubmitters: number;
    totalMinutes: number;
  };
  topSongs: Song[];
  topSubmitters: Submitter[];
  byDay: Array<{ date: string; plays: number }>;
  spotlight: { topSong: Song | null; topSubmitter: Submitter | null };
};

export function DJRecapModal({
  open,
  boardId,
  boardTitle,
  onClose,
}: {
  open: boolean;
  boardId: string;
  boardTitle: string;
  onClose: () => void;
}) {
  const [month, setMonth] = useState<string>(currentMonth());
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiFetch<RecapData>(
          `/api/dj/recap?boardId=${encodeURIComponent(boardId)}&month=${encodeURIComponent(month)}`,
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError) setError(`불러오기 실패 (${e.status})`);
          else setError(e instanceof Error ? e.message : "불러올 수 없어요");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, boardId, month]);

  const maxByDay = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.byDay.map((d) => d.plays));
  }, [data]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>📊 이달의 리캡</Text>
              <Text style={styles.title}>{boardTitle}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.monthbar}>
            <Pressable
              style={({ pressed }) => [styles.monthBtn, pressed && styles.monthBtnPressed]}
              onPress={() => setMonth(shiftMonth(month, -1))}
            >
              <Text style={styles.monthBtnText}>← {monthLabel(shiftMonth(month, -1))}</Text>
            </Pressable>
            <View style={styles.monthPill}>
              <Text style={styles.monthPillText}>{monthLabel(month)}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.monthBtn,
                (month >= currentMonth()) && styles.monthBtnDisabled,
                pressed && month < currentMonth() && styles.monthBtnPressed,
              ]}
              onPress={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= currentMonth()}
            >
              <Text style={styles.monthBtnText}>{monthLabel(shiftMonth(month, 1))} →</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.emptyText}>불러오는 중…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>😵</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : !data || data.totals.plays === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎵</Text>
              <Text style={styles.emptyText}>이 달에는 아직 재생된 곡이 없어요.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              {/* 탑스탯 */}
              <View style={styles.stats}>
                <Stat label="총 재생" value={`${data.totals.plays}`} unit="곡" />
                <Stat label="고유 곡" value={`${data.totals.uniqueSongs}`} unit="개" />
                <Stat label="참여" value={`${data.totals.uniqueSubmitters}`} unit="명" />
                {data.totals.totalMinutes > 0 ? (
                  <Stat label="총 시간" value={`${data.totals.totalMinutes}`} unit="분" />
                ) : null}
              </View>

              {/* 스포트라이트 */}
              {data.spotlight.topSong || data.spotlight.topSubmitter ? (
                <View style={styles.spotlight}>
                  {data.spotlight.topSong ? (
                    <View style={[styles.spot, styles.spotSong]}>
                      <Text style={styles.spotLabel}>🎵 가장 많이 들은 곡</Text>
                      {data.spotlight.topSong.linkImage ? (
                        <Image
                          source={{ uri: data.spotlight.topSong.linkImage }}
                          style={styles.spotThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.spotThumb, styles.spotThumbFallback]}>
                          <Text style={styles.spotThumbEmoji}>♪</Text>
                        </View>
                      )}
                      <Text style={styles.spotTitle} numberOfLines={2}>
                        {data.spotlight.topSong.title}
                      </Text>
                      <Text style={styles.spotMeta}>{data.spotlight.topSong.plays}회 재생</Text>
                    </View>
                  ) : null}
                  {data.spotlight.topSubmitter ? (
                    <View style={[styles.spot, styles.spotDJ]}>
                      <Text style={styles.spotLabel}>🏆 이달의 DJ</Text>
                      <View style={styles.spotAvatar}>
                        <Text style={styles.spotAvatarText}>
                          {data.spotlight.topSubmitter.name[0]}
                        </Text>
                      </View>
                      <Text style={styles.spotTitle}>{data.spotlight.topSubmitter.name}</Text>
                      <Text style={styles.spotMeta}>
                        {data.spotlight.topSubmitter.plays}회 · {data.spotlight.topSubmitter.uniqueSongs}곡
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Top 곡 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top 10 곡</Text>
                {data.topSongs.map((song, i) => (
                  <View key={song.key} style={styles.songRow}>
                    <Text style={[styles.pos, i < 3 && styles.posTop]}>{i + 1}</Text>
                    {song.linkImage ? (
                      <Image source={{ uri: song.linkImage }} style={styles.songThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.songThumb, styles.spotThumbFallback]}>
                        <Text style={styles.spotThumbEmoji}>♪</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                      {song.firstSubmitter ? (
                        <Text style={styles.songSub}>첫 신청 {song.firstSubmitter}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.songPlays}>{song.plays}회</Text>
                  </View>
                ))}
              </View>

              {/* 제출자 랭킹 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>신청 TOP</Text>
                {data.topSubmitters.map((s, i) => (
                  <View key={`${s.id ?? s.name}`} style={styles.rankRow}>
                    <Text style={[styles.pos, i < 3 && styles.posTop]}>{i + 1}</Text>
                    <View style={[styles.rankAvatar, i === 0 && styles.rankAvatarTop]}>
                      <Text style={[styles.rankAvatarText, i === 0 && { color: "#fff" }]}>
                        {s.name[0]}
                      </Text>
                    </View>
                    <Text style={styles.rankName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.rankCount}>{s.plays}회 · {s.uniqueSongs}곡</Text>
                  </View>
                ))}
              </View>

              {/* 일별 bar */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>일별 재생</Text>
                <View style={styles.bars}>
                  {data.byDay.map((d) => {
                    const h = (d.plays / maxByDay) * 100;
                    return (
                      <View key={d.date} style={styles.barCol}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${Math.max(3, h)}%` },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
                <View style={styles.barsXaxis}>
                  <Text style={styles.barsXtext}>{data.byDay[0]?.date.slice(5)}</Text>
                  <Text style={styles.barsXtext}>
                    {data.byDay[data.byDay.length - 1]?.date.slice(5)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map((s) => parseInt(s, 10));
  const d = new Date(y!, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${parseInt(m!, 10)}월`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.cardHover,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  eyebrow: { ...typography.badge, color: colors.accent, marginBottom: 4 },
  title: { ...typography.title, color: colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, color: colors.textMuted },

  monthbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthBtnPressed: { backgroundColor: colors.surfaceAlt },
  monthBtnDisabled: { opacity: 0.3 },
  monthBtnText: { ...typography.micro, color: colors.textMuted },
  monthPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    backgroundColor: colors.accentTintedBg,
    borderRadius: radii.pill,
  },
  monthPillText: { ...typography.label, color: colors.accentTintedText, fontSize: 14, fontWeight: "700" },

  body: { padding: spacing.xl, gap: spacing.xl },
  emptyBox: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" },

  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  statUnit: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  statLabel: { ...typography.micro, color: colors.textMuted, marginTop: 2 },

  spotlight: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  spot: {
    flex: 1,
    minWidth: 200,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs + 2,
    borderWidth: 1,
  },
  spotSong: { backgroundColor: "#fff7e6", borderColor: "rgba(201,162,39,0.3)" },
  spotDJ: { backgroundColor: "#e8f3ff", borderColor: "rgba(0,117,222,0.3)" },
  spotLabel: { ...typography.badge, fontSize: 11, color: colors.textMuted },
  spotThumb: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  spotThumbFallback: {
    backgroundColor: "#d6b8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  spotThumbEmoji: { fontSize: 20, color: "#fff" },
  spotAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#c9a227",
    alignItems: "center",
    justifyContent: "center",
  },
  spotAvatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  spotTitle: { ...typography.section, color: colors.text, textAlign: "center" },
  spotMeta: { ...typography.micro, color: colors.textMuted },

  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, fontSize: 14, fontWeight: "700", color: colors.text },

  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.bg,
    borderRadius: 8,
    minHeight: tapMin,
  },
  pos: {
    width: 28,
    textAlign: "center",
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 13,
    color: colors.textMuted,
  },
  posTop: { color: "#c9a227" },
  songThumb: {
    width: 56,
    height: 32,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
  },
  songTitle: { ...typography.label, fontSize: 14, color: colors.text, fontWeight: "600" },
  songSub: { ...typography.micro, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  songPlays: { ...typography.label, fontSize: 13, color: colors.accent, fontVariant: ["tabular-nums"] },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: 6,
  },
  rankAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankAvatarTop: { backgroundColor: "#c9a227" },
  rankAvatarText: { fontSize: 12, fontWeight: "600", color: colors.text },
  rankName: { flex: 1, ...typography.body, fontSize: 13, color: colors.text },
  rankCount: { ...typography.micro, color: colors.textMuted, fontVariant: ["tabular-nums"] },

  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: spacing.sm + 4,
    gap: 2,
  },
  barCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    backgroundColor: colors.accent,
    borderRadius: 2,
    opacity: 0.8,
    minHeight: 2,
  },
  barsXaxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  barsXtext: { ...typography.micro, fontSize: 11, color: colors.textFaint },
});
