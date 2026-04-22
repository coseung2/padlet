import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  radii,
  spacing,
  typography,
} from "../../../theme/tokens";
import { layoutEmoji, layoutLabel } from "../../../theme/layout-meta";
import { VibeArcadeMock } from "../../../components/VibeArcadeMock";
import { QuizMock } from "../../../components/QuizMock";
import { AssignmentMock } from "../../../components/AssignmentMock";
import { ColumnsMock } from "../../../components/ColumnsMock";

// 보드 상세. layout query 파라미터에 따라 렌더 분기.
// 구현된 레이아웃: vibe-arcade / quiz / assignment / columns. 나머지는 placeholder.

export default function BoardDetail() {
  const { slug, layout } = useLocalSearchParams<{ slug: string; layout?: string }>();
  const router = useRouter();
  const layoutKey = layout ?? "columns";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {slug}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>{layoutEmoji(layoutKey)}</Text>
          <Text style={styles.badgeText}>{layoutLabel(layoutKey)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {renderLayout(layoutKey)}
      </View>
    </SafeAreaView>
  );
}

function renderLayout(layoutKey: string) {
  switch (layoutKey) {
    case "vibe-arcade":
      return <VibeArcadeMock />;
    case "quiz":
      return <QuizMock />;
    case "assignment":
      return <AssignmentMock />;
    case "columns":
      return <ColumnsMock />;
    default:
      return <Placeholder layout={layoutKey} />;
  }
}

function Placeholder({ layout }: { layout: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderEmoji}>{layoutEmoji(layout)}</Text>
      <Text style={styles.placeholderTitle}>
        {layoutLabel(layout)} 화면은 다음 시안에서 제공됩니다
      </Text>
      <Text style={styles.placeholderSub}>
        현재 mockup 제공: 코딩 교실 · 퀴즈 · 과제 배부 · 주제별 보드
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  backBtnPressed: {
    backgroundColor: colors.border,
  },
  backArrow: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    ...typography.title,
    color: colors.text,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTintedBg,
  },
  badgeEmoji: {
    fontSize: 18,
  },
  badgeText: {
    ...typography.label,
    color: colors.accentTintedText,
  },
  body: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
    gap: spacing.lg,
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  placeholderTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  placeholderSub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
