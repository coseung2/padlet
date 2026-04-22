import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../theme/tokens";

// 과제 배부 — 학생 본인 슬롯 상세 (mockup).
// 구조:
//   상단: 과제 안내 카드 (제목, 마감, 선생님 피드백)
//   중앙: 제출 상태 + 액션 (파일 첨부, 제출하기)
//   하단: 내 제출 히스토리 스냅

type Status = "assigned" | "submitted" | "reviewed" | "returned";

const MOCK = {
  boardTitle: "수학 과제 — 도형의 닮음",
  guide:
    "P.42-45 연습문제를 풀어 사진 또는 PDF로 제출해 주세요. 해결 과정도 같이 보여주면 좋아요.",
  deadline: "4/24 (목) 18:00",
  myStatus: "submitted" as Status,
  submittedAt: "4/22 19:34",
  fileName: "수학_도형닮음_김민아.jpg",
  feedback: null as string | null,
  grade: null as string | null,
  classStats: {
    total: 30,
    submitted: 18,
    reviewed: 6,
  },
};

const STATUS_META: Record<Status, { label: string; bg: string; text: string }> = {
  assigned: { label: "미제출", bg: colors.surfaceAlt, text: colors.textMuted },
  submitted: { label: "제출 완료", bg: colors.statusSubmittedBg, text: colors.statusSubmittedText },
  reviewed: { label: "검토됨", bg: colors.statusReviewedBg, text: colors.statusReviewedText },
  returned: { label: "반려됨", bg: colors.statusReturnedBg, text: colors.statusReturnedText },
};

export function AssignmentMock() {
  const meta = STATUS_META[MOCK.myStatus];
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>{MOCK.boardTitle}</Text>
          <Text style={styles.guideText}>{MOCK.guide}</Text>
          <View style={styles.guideMeta}>
            <Text style={styles.deadlineLabel}>마감</Text>
            <Text style={styles.deadlineValue}>{MOCK.deadline}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>우리 반 현황</Text>
          <StatRow label="제출" done={MOCK.classStats.submitted} total={MOCK.classStats.total} color={colors.statusSubmittedText} />
          <StatRow label="검토 완료" done={MOCK.classStats.reviewed} total={MOCK.classStats.total} color={colors.statusReviewedText} />
        </View>
      </View>

      <View style={styles.mySlot}>
        <View style={styles.mySlotHead}>
          <Text style={styles.mySlotName}>내 제출함</Text>
          <View style={[styles.pill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.pillText, { color: meta.text }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.submissionRow}>
          <View style={styles.fileChip}>
            <Text style={styles.fileEmoji}>📎</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {MOCK.fileName}
              </Text>
              <Text style={styles.fileMeta}>{MOCK.submittedAt} 제출</Text>
            </View>
          </View>

          <Pressable style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
            <Text style={styles.actionBtnText}>다시 제출</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.actionBtnPrimary, pressed && { backgroundColor: colors.accentActive }]}>
            <Text style={styles.actionBtnPrimaryText}>파일 교체</Text>
          </Pressable>
        </View>

        {MOCK.feedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>선생님 피드백</Text>
            <Text style={styles.feedbackText}>{MOCK.feedback}</Text>
          </View>
        ) : (
          <Text style={styles.awaitingText}>선생님이 검토하시는 중입니다. 기다려 주세요 🙂</Text>
        )}
      </View>
    </View>
  );
}

function StatRow({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const ratio = total === 0 ? 0 : done / total;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBar}>
        <View style={[styles.statBarFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statValue, { color }]}>{done}/{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  guideCard: {
    flex: 2,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...shadows.card,
    gap: spacing.md,
  },
  guideTitle: {
    ...typography.title,
    color: colors.text,
  },
  guideText: {
    ...typography.body,
    color: colors.textMuted,
  },
  guideMeta: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  deadlineLabel: {
    ...typography.label,
    color: colors.textFaint,
  },
  deadlineValue: {
    ...typography.subtitle,
    color: colors.danger,
  },

  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...shadows.card,
    gap: spacing.md,
  },
  statsTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    width: 72,
  },
  statBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  statValue: {
    ...typography.label,
    minWidth: 40,
    textAlign: "right",
  },

  mySlot: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...shadows.card,
    gap: spacing.lg,
  },
  mySlotHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mySlotName: {
    ...typography.title,
    color: colors.text,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pillText: {
    ...typography.label,
  },

  submissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  fileChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.accentTintedBg,
    padding: spacing.md,
    borderRadius: radii.card,
  },
  fileEmoji: {
    fontSize: 28,
  },
  fileName: {
    ...typography.section,
    color: colors.text,
  },
  fileMeta: {
    ...typography.micro,
    color: colors.textMuted,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  actionBtnText: {
    ...typography.label,
    color: colors.textMuted,
  },
  actionBtnPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.accent,
  },
  actionBtnPrimaryText: {
    ...typography.label,
    color: "#fff",
  },

  feedbackBox: {
    backgroundColor: colors.statusReviewedBg,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  feedbackLabel: {
    ...typography.label,
    color: colors.statusReviewedText,
  },
  feedbackText: {
    ...typography.body,
    color: colors.text,
  },
  awaitingText: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
