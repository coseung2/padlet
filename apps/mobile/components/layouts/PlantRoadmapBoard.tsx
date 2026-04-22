import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../theme/tokens";
import type { BoardDetailResponse } from "../../lib/types";

// 식물 관찰(plant-roadmap) — 본인 식물의 성장 로드맵 + 최근 관찰 일지.
// 관찰 일지 신규 작성은 웹 앱에서 (카메라/태깅 UX 가 복잡해 일단 읽기 전용).

export function PlantRoadmapBoard({
  data,
}: {
  data: BoardDetailResponse;
  onMutate: () => void;
}) {
  const plants = data.layoutData.plantRoadmap?.plants ?? [];
  const primary = plants[0];

  if (!primary) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoEmoji}>🌱</Text>
        <Text style={styles.infoTitle}>아직 식물이 배정되지 않았어요</Text>
        <Text style={styles.infoMsg}>
          선생님이 식물을 지정하면 여기에 성장 기록이 나타나요.
        </Text>
      </View>
    );
  }

  const stages = primary.species.stages.sort((a, b) => a.order - b.order);
  const currentOrder = primary.currentStage.order;

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{primary.species.emoji}</Text>
        <View style={styles.heroText}>
          <Text style={styles.nickname}>{primary.nickname}</Text>
          <Text style={styles.species}>
            {primary.species.nameKo} · {primary.currentStage.icon} {primary.currentStage.nameKo}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>🛣️ 성장 로드맵</Text>
      <View style={styles.roadmap}>
        {stages.map((stage, idx) => {
          const state =
            stage.order < currentOrder
              ? "visited"
              : stage.order === currentOrder
                ? "active"
                : "upcoming";
          return (
            <View key={stage.id} style={styles.stageRow}>
              <View
                style={[
                  styles.dot,
                  state === "visited" && { backgroundColor: colors.plantVisited },
                  state === "active" && { backgroundColor: colors.plantActive },
                  state === "upcoming" && { backgroundColor: colors.plantUpcoming },
                ]}
              >
                <Text style={styles.dotText}>{stage.icon}</Text>
              </View>
              {idx < stages.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    state === "visited" && { backgroundColor: colors.plantVisited },
                    state === "active" && { backgroundColor: colors.plantActive },
                  ]}
                />
              ) : null}
              <Text
                style={[
                  styles.stageLabel,
                  state === "active" && styles.stageLabelActive,
                ]}
                numberOfLines={1}
              >
                {stage.nameKo}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>📔 최근 관찰 일지</Text>
      <FlatList
        data={primary.observations}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.obsList}
        renderItem={({ item }) => (
          <View style={styles.obsCard}>
            <View style={styles.obsHead}>
              <Text style={styles.obsStage}>{item.stage.nameKo}</Text>
              <Text style={styles.obsDate}>
                {new Date(item.observedAt).toLocaleDateString("ko-KR")}
              </Text>
            </View>
            {item.memo ? <Text style={styles.obsMemo}>{item.memo}</Text> : null}
            {item.images.length > 0 ? (
              <FlatList
                horizontal
                data={item.images}
                keyExtractor={(img) => img.id}
                renderItem={({ item: img }) => (
                  <Image source={{ uri: img.url }} style={styles.obsImage} resizeMode="cover" />
                )}
                contentContainerStyle={styles.obsImageRow}
              />
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.obsEmpty}>아직 관찰 일지가 없어요.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  infoEmoji: { fontSize: 72 },
  infoTitle: { ...typography.title, color: colors.text, textAlign: "center" },
  infoMsg: { ...typography.body, color: colors.textMuted, textAlign: "center" },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
  },
  heroEmoji: { fontSize: 72 },
  heroText: { flex: 1, gap: 4 },
  nickname: { ...typography.display, color: colors.text },
  species: { ...typography.body, color: colors.textMuted },
  sectionTitle: { ...typography.section, color: colors.text, marginTop: spacing.sm },

  roadmap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
  },
  stageRow: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  dotText: { fontSize: 22 },
  line: {
    position: "absolute",
    left: "70%",
    right: "-30%",
    top: 24,
    height: 2,
    backgroundColor: colors.plantUpcoming,
  },
  stageLabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  stageLabelActive: {
    ...typography.label,
    color: colors.plantActive,
  },

  obsList: { gap: spacing.md, paddingBottom: spacing.xxl },
  obsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...shadows.card,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  obsHead: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  obsStage: { ...typography.label, color: colors.accentTintedText },
  obsDate: { ...typography.micro, color: colors.textFaint },
  obsMemo: { ...typography.body, color: colors.text },
  obsImageRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  obsImage: {
    width: 120,
    height: 90,
    borderRadius: radii.btn,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  obsEmpty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.lg,
  },
});
