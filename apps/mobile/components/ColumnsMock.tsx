import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../theme/tokens";

// 주제별 보드 — 칸반 스타일 세로 칼럼 × N, 각 칼럼 안에 카드 세로 스택.
// Tab S6 Lite 가로 2000px 에 3~4 칼럼 동시 표시 + 가로 스크롤로 초과분.

type Card = {
  id: string;
  title: string;
  author: string;
  color: string;
};

type Column = {
  id: string;
  title: string;
  cards: Card[];
};

const MOCK: Column[] = [
  {
    id: "c1",
    title: "📌 오늘의 질문",
    cards: [
      { id: "k1", title: "점심 뭐 먹고 싶어?", author: "김민아", color: "#ffd8f4" },
      { id: "k2", title: "체육 시간 농구 vs 축구", author: "이준서", color: "#c3faf5" },
      { id: "k3", title: "수학 숙제 언제 할거야?", author: "박서연", color: "#ffe6cd" },
    ],
  },
  {
    id: "c2",
    title: "💡 아이디어",
    cards: [
      { id: "k4", title: "학급 티셔츠 디자인 공모", author: "정우진", color: "#fde0f0" },
      { id: "k5", title: "쉬는 시간 놀이 추천", author: "최지안", color: "#f2f9ff" },
      { id: "k6", title: "독서 감상문 공유 게시판", author: "한도윤", color: "#fbd4d4" },
      { id: "k7", title: "급식 메뉴 설문", author: "강유나", color: "#ffc6c6" },
    ],
  },
  {
    id: "c3",
    title: "❓ 고민 상담",
    cards: [
      { id: "k8", title: "친구랑 다퉜는데 어떻게 화해하지?", author: "윤서진", color: "#fde0f0" },
      { id: "k9", title: "학원 숙제가 너무 많아요", author: "조하린", color: "#ffe6cd" },
    ],
  },
  {
    id: "c4",
    title: "✨ 발표 주제",
    cards: [
      { id: "k10", title: "우주와 블랙홀", author: "임채원", color: "#c3faf5" },
      { id: "k11", title: "K-POP 역사 5분 요약", author: "오수빈", color: "#ffd8f4" },
      { id: "k12", title: "우리 동네 맛집 지도", author: "장유민", color: "#ffe6cd" },
    ],
  },
];

export function ColumnsMock() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      contentContainerStyle={styles.root}
    >
      {MOCK.map((col) => (
        <ColumnView key={col.id} column={col} />
      ))}
      <Pressable style={({ pressed }) => [styles.newColumn, pressed && styles.newColumnPressed]}>
        <Text style={styles.newColumnPlus}>+</Text>
        <Text style={styles.newColumnText}>새 주제 추가</Text>
      </Pressable>
    </ScrollView>
  );
}

function ColumnView({ column }: { column: Column }) {
  return (
    <View style={styles.column}>
      <View style={styles.columnHead}>
        <Text style={styles.columnTitle}>{column.title}</Text>
        <Text style={styles.columnCount}>{column.cards.length}</Text>
      </View>
      <View style={styles.cards}>
        {column.cards.map((c) => (
          <CardView key={c.id} card={c} />
        ))}
        <Pressable style={({ pressed }) => [styles.addCard, pressed && styles.addCardPressed]}>
          <Text style={styles.addCardText}>+ 카드 추가</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CardView({ card }: { card: Card }) {
  return (
    <View style={[styles.card, { backgroundColor: card.color }]}>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardAuthor}>— {card.author}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.xl,
    gap: spacing.lg,
    flexDirection: "row",
  },
  column: {
    width: 320,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  columnHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  columnTitle: {
    ...typography.section,
    color: colors.text,
  },
  columnCount: {
    ...typography.label,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    minWidth: 24,
    textAlign: "center",
  },
  cards: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.card,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  cardAuthor: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  addCard: {
    padding: spacing.md,
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  addCardPressed: {
    backgroundColor: colors.surface,
  },
  addCardText: {
    ...typography.label,
    color: colors.textFaint,
  },

  newColumn: {
    width: 280,
    borderRadius: radii.card,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  newColumnPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  newColumnPlus: {
    fontSize: 48,
    color: colors.textFaint,
    fontWeight: "300",
  },
  newColumnText: {
    ...typography.label,
    color: colors.textFaint,
  },
});
