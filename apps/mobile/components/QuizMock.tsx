import { StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../theme/tokens";

// 퀴즈 — 카훗 스타일. 단계:
//   1. waiting (참여자 모임)
//   2. playing (문제 진행 중, 4지선다 버튼)
//   3. leaderboard (순위)
// mockup 은 "playing" 단계만 렌더. 시안용이라 타이머는 정적.

const MOCK_QUESTION = {
  no: 3,
  total: 10,
  text: "대한민국의 수도는?",
  choices: [
    { id: "A", label: "부산", color: "#ef4444" },
    { id: "B", label: "서울", color: "#3b82f6" },
    { id: "C", label: "광주", color: "#f59e0b" },
    { id: "D", label: "대전", color: "#10b981" },
  ],
  timeLeft: 14,
  players: 23,
};

export function QuizMock() {
  const [selected, setSelected] = useState<string | null>(null);

  const { no, total, text, choices, timeLeft, players } = MOCK_QUESTION;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.qNum}>
            문제 {no} / {total}
          </Text>
          <Text style={styles.qText}>{text}</Text>
        </View>
        <View style={styles.meta}>
          <View style={styles.timer}>
            <Text style={styles.timerText}>⏱ {timeLeft}</Text>
          </View>
          <View style={styles.players}>
            <Text style={styles.playersText}>👥 {players}명</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {choices.map((c) => {
          const active = selected === c.id;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.choice,
                { backgroundColor: c.color },
                pressed && { opacity: 0.9 },
                active && styles.choiceActive,
              ]}
              onPress={() => setSelected(c.id)}
            >
              <Text style={styles.choiceLetter}>{c.id}</Text>
              <Text style={styles.choiceLabel}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {selected ? (
          <Text style={styles.footerPicked}>
            ✅ {selected} 선택함 — 제출 대기 중…
          </Text>
        ) : (
          <Text style={styles.footerHint}>정답이라고 생각하는 카드를 눌러요</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.xxl,
    gap: spacing.xl,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.card,
    ...shadows.card,
  },
  qNum: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  qText: {
    ...typography.display,
    color: colors.text,
  },
  meta: {
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  timer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warningTintedBg,
    borderRadius: radii.pill,
  },
  timerText: {
    ...typography.section,
    color: colors.warning,
  },
  players: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
  },
  playersText: {
    ...typography.label,
    color: colors.textMuted,
  },

  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  choice: {
    width: "49%",
    aspectRatio: 2.5,
    borderRadius: radii.card,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.card,
  },
  choiceActive: {
    borderWidth: 4,
    borderColor: "#fff",
  },
  choiceLetter: {
    fontSize: 56,
    fontWeight: "900",
    color: "#fff",
    width: 64,
    textAlign: "center",
  },
  choiceLabel: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },

  footer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  footerHint: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  footerPicked: {
    ...typography.subtitle,
    color: colors.plantActive,
  },
});
