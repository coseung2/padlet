import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../theme/tokens";
import { layoutEmoji, layoutLabel } from "../../theme/layout-meta";

// 학생 대시보드. Tab S6 Lite 가로(2000×1200)기준:
//   - 최상단: 학생 이름 + 학급 + 로그아웃
//   - 담당 업무 섹션(선택)
//   - 오늘의 보드 4-col grid
//
// 지금은 mockup data. 실제 fetch 는 후속 phase (/api/student + classroom boards).

type BoardItem = {
  id: string;
  slug: string;
  title: string;
  layout: string;
};

const MOCK_STUDENT = {
  name: "김민아",
  classroom: "별무리반",
};

const MOCK_BOARDS: BoardItem[] = [
  { id: "b1", slug: "coding-classroom-1", title: "오늘의 코딩 교실", layout: "vibe-arcade" },
  { id: "b2", slug: "science-quiz-1", title: "과학 단원평가 퀴즈", layout: "quiz" },
  { id: "b3", slug: "math-hw-1", title: "수학 과제 배부", layout: "assignment" },
  { id: "b4", slug: "discussion-1", title: "오늘의 토론 주제", layout: "columns" },
  { id: "b5", slug: "music-dj-1", title: "쉬는 시간 DJ", layout: "dj-queue" },
  { id: "b6", slug: "gallery-1", title: "친구들 작품 갤러리", layout: "vibe-gallery" },
  { id: "b7", slug: "midterm-1", title: "중간 수행평가", layout: "assessment" },
  { id: "b8", slug: "plant-1", title: "우리반 식물 관찰", layout: "plant-roadmap" },
];

export default function StudentHome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{MOCK_STUDENT.name}님, 안녕하세요!</Text>
          <Text style={styles.classroom}>
            {MOCK_STUDENT.classroom} · 오늘의 보드
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={() => router.replace("/(student)/login")}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <FlatList
        data={MOCK_BOARDS}
        keyExtractor={(b) => b.id}
        numColumns={4}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => <BoardCard board={item} />}
      />
    </SafeAreaView>
  );
}

function BoardCard({ board }: { board: BoardItem }) {
  const router = useRouter();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/(student)/board/${board.slug}?layout=${board.layout}`)}
    >
      <View style={styles.cardEmojiWrap}>
        <Text style={styles.cardEmoji}>{layoutEmoji(board.layout)}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {board.title}
      </Text>
      <Text style={styles.cardLayout}>{layoutLabel(board.layout)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.display,
    color: colors.text,
  },
  classroom: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  logoutBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  logoutBtnPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  logoutText: {
    ...typography.label,
    color: colors.textMuted,
  },
  gridContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  gridRow: {
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
    transform: [{ scale: 0.98 }],
  },
  cardEmojiWrap: {
    marginBottom: spacing.md,
  },
  cardEmoji: {
    fontSize: 56,
  },
  cardTitle: {
    ...typography.section,
    color: colors.text,
    textAlign: "center",
  },
  cardLayout: {
    ...typography.label,
    color: colors.textFaint,
    marginTop: spacing.xs,
  },
});
