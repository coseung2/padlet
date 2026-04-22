import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";

// 루트 레이아웃. 모든 스크린을 Stack 으로 감싸되 헤더는 각 segment 에서 커스텀.
// 지금 단계는 mockup — 실제 nav 는 expo-router 가 자동 처리.

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </SafeAreaProvider>
  );
}
