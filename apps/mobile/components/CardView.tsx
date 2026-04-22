import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, shadows, spacing, typography } from "../theme/tokens";
import type { BoardCard } from "../lib/types";

// 단일 카드 뷰. freeform/grid/stream/columns 공용.
// 카드 본문 + 링크/파일/이미지 첨부 + 작성자.

export function CardView({ card }: { card: BoardCard }) {
  const bg = card.color ?? colors.surface;
  const firstImage =
    card.imageUrl ??
    card.attachments?.find((a) => a.kind === "image")?.url ??
    card.linkImage ??
    null;
  const authorName = card.authors?.[0]?.displayName ?? card.externalAuthorName;
  const hasLink = Boolean(card.linkUrl);
  const hasVideo = Boolean(card.videoUrl);
  const fileUrl = card.fileUrl ?? card.attachments?.find((a) => a.kind === "file")?.url;
  const fileName = card.fileName ?? card.attachments?.find((a) => a.kind === "file")?.fileName;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      {firstImage ? (
        <Image source={{ uri: firstImage }} style={styles.image} resizeMode="cover" />
      ) : null}
      <View style={styles.body}>
        {card.title ? (
          <Text style={styles.title} numberOfLines={3}>
            {card.title}
          </Text>
        ) : null}
        {card.content ? (
          <Text style={styles.content} numberOfLines={6}>
            {card.content}
          </Text>
        ) : null}
        {hasLink ? (
          <Pressable
            onPress={() => card.linkUrl && Linking.openURL(card.linkUrl)}
            style={styles.linkBox}
          >
            <Text style={styles.linkHost} numberOfLines={1}>
              {safeHost(card.linkUrl)}
            </Text>
            <Text style={styles.linkTitle} numberOfLines={2}>
              {card.linkTitle ?? card.linkUrl}
            </Text>
            {card.linkDesc ? (
              <Text style={styles.linkDesc} numberOfLines={2}>
                {card.linkDesc}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        {hasVideo ? (
          <Pressable
            onPress={() => card.videoUrl && Linking.openURL(card.videoUrl)}
            style={styles.videoBox}
          >
            <Text style={styles.videoLabel}>▶ 영상 열기</Text>
          </Pressable>
        ) : null}
        {fileUrl ? (
          <Pressable
            onPress={() => Linking.openURL(fileUrl)}
            style={styles.fileBox}
          >
            <Text style={styles.fileIcon}>📎</Text>
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName ?? "파일 열기"}
            </Text>
          </Pressable>
        ) : null}
        {authorName ? (
          <Text style={styles.author}>— {authorName}</Text>
        ) : null}
      </View>
    </View>
  );
}

function safeHost(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    overflow: "hidden",
    ...shadows.card,
  },
  image: {
    width: "100%",
    height: 140,
    backgroundColor: colors.surfaceAlt,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  content: {
    ...typography.body,
    color: colors.text,
  },
  author: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  linkBox: {
    padding: spacing.sm,
    borderRadius: radii.btn,
    backgroundColor: colors.accentTintedBg,
    gap: 2,
  },
  linkHost: {
    ...typography.micro,
    color: colors.accentTintedText,
  },
  linkTitle: {
    ...typography.label,
    color: colors.text,
  },
  linkDesc: {
    ...typography.micro,
    color: colors.textMuted,
  },
  videoBox: {
    padding: spacing.sm,
    borderRadius: radii.btn,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  videoLabel: {
    ...typography.label,
    color: colors.text,
  },
  fileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.btn,
    backgroundColor: colors.surfaceAlt,
  },
  fileIcon: { fontSize: 16 },
  fileName: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
});
