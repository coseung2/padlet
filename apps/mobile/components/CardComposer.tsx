import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { colors, radii, shadows, spacing, tapMin, typography } from "../theme/tokens";
import { apiFetch, getApiBase } from "../lib/api";
import { loadSessionToken } from "../lib/session";
import type { BoardCard } from "../lib/types";

// 카드 작성 모달. 제목 + 본문 + 이미지/파일 첨부.
// POST /api/cards 는 이미 학생 bearer 를 받으니 그대로 사용.

type Props = {
  visible: boolean;
  boardId: string;
  sectionId?: string | null;
  onClose: () => void;
  onCreated: (card: BoardCard) => void;
};

type UploadResult = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export function CardComposer({ visible, boardId, sectionId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<UploadResult | null>(null);
  const [file, setFile] = useState<UploadResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setContent("");
    setImage(null);
    setFile(null);
  }

  async function uploadAsset(uri: string, name: string, mime: string): Promise<UploadResult> {
    const token = await loadSessionToken();
    const form = new FormData();
    // RN FormData file 포맷.
    form.append("file", {
      uri,
      name,
      type: mime,
    } as unknown as Blob);
    const res = await fetch(`${getApiBase()}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form as unknown as BodyInit,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`업로드 실패 (${res.status}): ${txt}`);
    }
    const body = (await res.json()) as {
      url: string;
      name?: string;
      size?: number;
      mimeType?: string;
    };
    return {
      url: body.url,
      fileName: body.name ?? name,
      fileSize: body.size ?? 0,
      mimeType: body.mimeType ?? mime,
    };
  }

  async function handlePickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("권한 필요", "사진 선택 권한을 허용해 주세요.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      const uri = asset.uri;
      const name = asset.fileName ?? `image-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? "image/jpeg";
      setSubmitting(true);
      const up = await uploadAsset(uri, name, mime);
      setImage(up);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      setSubmitting(true);
      const up = await uploadAsset(
        asset.uri,
        asset.name,
        asset.mimeType ?? "application/octet-stream",
      );
      setFile(up);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() && !content.trim() && !image && !file) {
      Alert.alert("비어있어요", "제목·본문·첨부 중 하나는 있어야 해요.");
      return;
    }
    setSubmitting(true);
    try {
      const attachments: Array<{
        kind: "image" | "file";
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }> = [];
      if (image) {
        attachments.push({
          kind: "image",
          url: image.url,
          fileName: image.fileName,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
        });
      }
      if (file) {
        attachments.push({
          kind: "file",
          url: file.url,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        });
      }
      const payload: Record<string, unknown> = {
        boardId,
        title: title.trim() || "(제목 없음)",
        content: content.trim(),
      };
      if (sectionId) payload.sectionId = sectionId;
      if (attachments.length) payload.attachments = attachments;
      // 이미지가 있으면 호환성을 위해 imageUrl 도 채움.
      if (image) payload.imageUrl = image.url;
      // 파일은 singleton 필드도 유지 (legacy 웹 뷰어 호환).
      if (file) {
        payload.fileUrl = file.url;
        payload.fileName = file.fileName;
        payload.fileSize = file.fileSize;
        payload.fileMimeType = file.mimeType;
      }
      const res = await apiFetch<{ card: BoardCard }>("/api/cards", {
        method: "POST",
        json: payload,
      });
      onCreated(res.card);
      reset();
      onClose();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>새 카드</Text>
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="제목"
            placeholderTextColor={colors.textFaint}
            editable={!submitting}
          />
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="내용을 입력하세요"
            placeholderTextColor={colors.textFaint}
            multiline
            editable={!submitting}
          />
          <View style={styles.attachRow}>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
              onPress={handlePickImage}
              disabled={submitting}
            >
              <Text style={styles.attachText}>🖼️ 이미지 {image ? "✓" : ""}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
              onPress={handlePickFile}
              disabled={submitting}
            >
              <Text style={styles.attachText}>📎 파일 {file ? "✓" : ""}</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              submitting && styles.submitBtnDisabled,
              pressed && !submitting && styles.submitBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>등록하기</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  sheet: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.cardHover,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: { ...typography.title, color: colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  closeText: { fontSize: 18, color: colors.textMuted },
  titleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.btn,
    padding: spacing.md,
    ...typography.subtitle,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.btn,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.bg,
    minHeight: 120,
    textAlignVertical: "top",
  },
  attachRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  attachBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    minHeight: tapMin,
    justifyContent: "center",
  },
  attachBtnPressed: { backgroundColor: colors.surfaceAlt },
  attachText: { ...typography.label, color: colors.textMuted },
  submitBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.card,
    alignItems: "center",
    minHeight: tapMin,
    ...shadows.accent,
  },
  submitBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnPressed: { backgroundColor: colors.accentActive },
  submitText: { ...typography.subtitle, color: "#fff" },
});
