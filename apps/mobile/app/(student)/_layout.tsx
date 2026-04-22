import { Stack } from "expo-router";
import { colors } from "../../theme/tokens";

// Student segment 전체 공통 layout.
export default function StudentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    />
  );
}
