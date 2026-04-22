import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../theme/tokens";

// 코딩 교실 mockup — 태블릿 가로 2000×1200.
// 구조:
//   탭 바 (슬롯 | 신작 | 인기 | 평가 미작성)
//   - 슬롯: 학생 그리드 (6열) — 각 슬롯에 상태 뱃지
//   - 신작/인기: 카드 그리드 (4열) — 제목 + 썸네일 + 평점
//
// + 우하단 FAB (새 작품 만들기)

type Tab = "slots" | "new" | "popular" | "to-review";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "slots", label: "🧑‍🎓 슬롯" },
  { key: "new", label: "✨ 신작" },
  { key: "popular", label: "🔥 인기" },
  { key: "to-review", label: "🎯 평가 미작성" },
];

type SlotStatus = "empty" | "in-progress" | "needs-review" | "submitted" | "returned";

type Slot = {
  studentId: string;
  number: number | null;
  name: string;
  status: SlotStatus;
  projectTitle: string | null;
};

type CatalogItem = {
  id: string;
  title: string;
  author: string;
  emoji: string; // 썸네일 대체 (mockup)
  rating: number;
  plays: number;
};

const MOCK_SLOTS: Slot[] = [
  { studentId: "s01", number: 1, name: "김민아", status: "submitted", projectTitle: "별 그리기 게임" },
  { studentId: "s02", number: 2, name: "이준서", status: "needs-review", projectTitle: "한국사 OX 퀴즈" },
  { studentId: "s03", number: 3, name: "박서연", status: "in-progress", projectTitle: null },
  { studentId: "s04", number: 4, name: "정우진", status: "submitted", projectTitle: "2048 만들어봄" },
  { studentId: "s05", number: 5, name: "최지안", status: "empty", projectTitle: null },
  { studentId: "s06", number: 6, name: "한도윤", status: "returned", projectTitle: "리듬게임 v2" },
  { studentId: "s07", number: 7, name: "강유나", status: "submitted", projectTitle: "나만의 타이머" },
  { studentId: "s08", number: 8, name: "윤서진", status: "empty", projectTitle: null },
  { studentId: "s09", number: 9, name: "조하린", status: "in-progress", projectTitle: null },
  { studentId: "s10", number: 10, name: "임채원", status: "needs-review", projectTitle: "사자성어 퀴즈" },
  { studentId: "s11", number: 11, name: "오수빈", status: "empty", projectTitle: null },
  { studentId: "s12", number: 12, name: "장유민", status: "submitted", projectTitle: "스네이크 게임" },
];

const MOCK_CATALOG: CatalogItem[] = [
  { id: "p1", title: "별 그리기 게임", author: "김민아", emoji: "⭐", rating: 4.8, plays: 34 },
  { id: "p2", title: "2048", author: "정우진", emoji: "🟦", rating: 4.5, plays: 28 },
  { id: "p3", title: "한국사 OX 퀴즈", author: "이준서", emoji: "🇰🇷", rating: 4.2, plays: 19 },
  { id: "p4", title: "스네이크 게임", author: "장유민", emoji: "🐍", rating: 4.6, plays: 25 },
  { id: "p5", title: "나만의 타이머", author: "강유나", emoji: "⏰", rating: 3.9, plays: 11 },
  { id: "p6", title: "사자성어 퀴즈", author: "임채원", emoji: "📚", rating: 4.1, plays: 15 },
];

export function VibeArcadeMock() {
  const [tab, setTab] = useState<Tab>("slots");

  return (
    <View style={styles.root}>
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {tab === "slots" ? <SlotsGrid /> : <CatalogGrid />}
      </View>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => {}}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function SlotsGrid() {
  return (
    <FlatList
      data={MOCK_SLOTS}
      keyExtractor={(s) => s.studentId}
      numColumns={6}
      columnWrapperStyle={styles.slotRow}
      contentContainerStyle={styles.slotsContent}
      renderItem={({ item }) => <SlotCard slot={item} />}
    />
  );
}

function SlotCard({ slot }: { slot: Slot }) {
  const statusMeta = STATUS_META[slot.status];
  return (
    <View style={[styles.slotCard, { borderColor: statusMeta.border }]}>
      <View style={styles.slotHead}>
        <Text style={styles.slotNumber}>{slot.number ?? "-"}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusText, { color: statusMeta.text }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>
      <Text style={styles.slotName}>{slot.name}</Text>
      {slot.projectTitle ? (
        <Text style={styles.slotProject} numberOfLines={1}>
          {slot.projectTitle}
        </Text>
      ) : (
        <Text style={styles.slotPlaceholder}>아직 작품 없음</Text>
      )}
    </View>
  );
}

function CatalogGrid() {
  return (
    <FlatList
      data={MOCK_CATALOG}
      keyExtractor={(i) => i.id}
      numColumns={4}
      columnWrapperStyle={styles.catalogRow}
      contentContainerStyle={styles.catalogContent}
      renderItem={({ item }) => <CatalogCard item={item} />}
    />
  );
}

function CatalogCard({ item }: { item: CatalogItem }) {
  return (
    <Pressable style={({ pressed }) => [styles.catalogCard, pressed && styles.catalogCardPressed]}>
      <View style={styles.catalogThumb}>
        <Text style={styles.catalogThumbEmoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.catalogTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.catalogAuthor}>by {item.author}</Text>
      <View style={styles.catalogMetaRow}>
        <Text style={styles.catalogRating}>★ {item.rating.toFixed(1)}</Text>
        <Text style={styles.catalogPlays}>▶ {item.plays}</Text>
      </View>
    </Pressable>
  );
}

const STATUS_META: Record<
  SlotStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  empty: {
    label: "빈 슬롯",
    bg: colors.surfaceAlt,
    text: colors.textFaint,
    border: colors.border,
  },
  "in-progress": {
    label: "작업 중",
    bg: colors.warningTintedBg,
    text: colors.warning,
    border: colors.warning,
  },
  "needs-review": {
    label: "검토 대기",
    bg: colors.accentTintedBg,
    text: colors.accent,
    border: colors.accent,
  },
  submitted: {
    label: "승인됨",
    bg: colors.statusReviewedBg,
    text: colors.statusReviewedText,
    border: colors.plantActive,
  },
  returned: {
    label: "반려됨",
    bg: colors.statusReturnedBg,
    text: colors.statusReturnedText,
    border: colors.danger,
  },
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.xl,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },

  // Slots
  slotsContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  slotRow: {
    gap: spacing.md,
  },
  slotCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1.5,
    gap: spacing.xs,
    ...shadows.card,
  },
  slotHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  slotNumber: {
    ...typography.label,
    color: colors.textFaint,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  statusText: {
    ...typography.badge,
  },
  slotName: {
    ...typography.section,
    color: colors.text,
  },
  slotProject: {
    ...typography.micro,
    color: colors.textMuted,
  },
  slotPlaceholder: {
    ...typography.micro,
    color: colors.textFaint,
    fontStyle: "italic",
  },

  // Catalog
  catalogContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  catalogRow: {
    gap: spacing.lg,
  },
  catalogCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
    ...shadows.card,
  },
  catalogCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  catalogThumb: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogThumbEmoji: {
    fontSize: 64,
  },
  catalogTitle: {
    ...typography.section,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  catalogAuthor: {
    ...typography.micro,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginTop: 2,
  },
  catalogMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  catalogRating: {
    ...typography.label,
    color: colors.vibeRating,
  },
  catalogPlays: {
    ...typography.label,
    color: colors.textMuted,
  },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.xxl,
    bottom: spacing.xxl,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.accent,
  },
  fabPressed: {
    backgroundColor: colors.accentActive,
  },
  fabIcon: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 32,
  },
});
