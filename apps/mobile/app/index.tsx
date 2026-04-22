import { Redirect } from "expo-router";

// 앱 루트 → 학생 로그인으로 직접 리다이렉트. 교사 플로우는 웹 유지.
export default function Index() {
  return <Redirect href="/(student)/login" />;
}
