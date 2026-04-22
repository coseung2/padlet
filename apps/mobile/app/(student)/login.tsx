import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing, tapMin, typography } from "../../theme/tokens";

// 학생 로그인 — 태블릿 가로 레이아웃:
//   ┌─ QR 스캔 영역 (좌) ──┬─ 코드 입력 (우) ─┐
//   │  [카메라 자리]         │ 6자리 코드            │
//   │                       │ ○ ○ ○ ○ ○ ○           │
//   │                       │ [들어가기]            │
//   └──────────────────────┴─────────────────────┘
//
// 실제 카메라는 expo-camera 로 후속 phase. 지금은 UI shell + code 입력만.

export default function StudentLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
    // TODO: POST /api/student/login { code } — 지금은 mockup 이므로 바로 대시보드 이동.
    router.replace("/(student)");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.inner}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🪄</Text>
          <Text style={styles.brandTitle}>Aura-board</Text>
          <Text style={styles.brandSub}>학생 로그인</Text>
        </View>

        <View style={styles.twoPane}>
          {/* Left — QR scanner placeholder */}
          <View style={styles.qrPane}>
            <View style={styles.qrFrame}>
              <View style={styles.qrCornerTL} />
              <View style={styles.qrCornerTR} />
              <View style={styles.qrCornerBL} />
              <View style={styles.qrCornerBR} />
              <Text style={styles.qrEmoji}>📷</Text>
              <Text style={styles.qrHint}>
                선생님이 주신 카드의 QR을{"\n"}이 사각형 안에 맞춰 주세요
              </Text>
            </View>
          </View>

          {/* Right — 6-digit code */}
          <View style={styles.codePane}>
            <Text style={styles.codeHeading}>또는 코드로 입장</Text>
            <Text style={styles.codeSub}>
              카드 아래의 6자리 영문·숫자 코드를 입력하세요
            </Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="ABC123"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              textAlign="center"
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                code.trim().length !== 6 && styles.submitBtnDisabled,
                pressed && code.trim().length === 6 && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={code.trim().length !== 6}
            >
              <Text style={styles.submitText}>들어가기 →</Text>
            </Pressable>

            <Text style={styles.codeHelp}>
              코드를 잃어버렸다면 선생님께 다시 요청하세요.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.md,
  },
  brandEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    ...typography.display,
    color: colors.text,
  },
  brandSub: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  twoPane: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xl,
  },

  qrPane: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  qrFrame: {
    width: 320,
    height: 320,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  qrEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  qrHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  // 4 corner bracket marks (scanner look)
  qrCornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.accent,
    borderTopLeftRadius: radii.card,
  },
  qrCornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.accent,
    borderTopRightRadius: radii.card,
  },
  qrCornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.accent,
    borderBottomLeftRadius: radii.card,
  },
  qrCornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.accent,
    borderBottomRightRadius: radii.card,
  },

  codePane: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    ...shadows.card,
    padding: spacing.xxl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  codeHeading: {
    ...typography.title,
    color: colors.text,
  },
  codeSub: {
    ...typography.body,
    color: colors.textMuted,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: 8,
    color: colors.text,
    backgroundColor: colors.bg,
    marginTop: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    alignItems: "center",
    minHeight: tapMin,
    ...shadows.accent,
  },
  submitBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnPressed: {
    backgroundColor: colors.accentActive,
  },
  submitText: {
    ...typography.subtitle,
    color: "#fff",
  },
  codeHelp: {
    ...typography.micro,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
