// Design tokens — 1:1 포팅 from web src/styles/base.css :root.
// Notion-inspired warm neutral + 0075de accent. 웹 테마와 시각적 동일성 유지.
//
// RN 에는 CSS 변수가 없으므로 전부 JS 상수로 고정. StyleSheet 에서 참조.

export const colors = {
  bg: "#f6f5f4",
  bgAlt: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "rgba(0, 0, 0, 0.05)",
  text: "rgba(0, 0, 0, 0.95)",
  textMuted: "#615d59",
  textFaint: "#a39e98",
  accent: "#0075de",
  accentActive: "#005bab",
  accentTintedBg: "#f2f9ff",
  accentTintedText: "#097fe8",
  border: "rgba(0, 0, 0, 0.1)",
  borderHover: "rgba(0, 0, 0, 0.15)",
  danger: "#c62828",
  dangerActive: "#a01b1b",
  warning: "#f59e0b",
  warningTintedBg: "#fef3c7",

  plantActive: "#27a35f",
  plantVisited: "#b8dfc7",
  plantUpcoming: "#d0cfcd",
  plantStalled: "#c62828",

  statusSubmittedBg: "#f2f9ff",
  statusSubmittedText: "#1565c0",
  statusReviewedBg: "#e8f5e9",
  statusReviewedText: "#2e7d32",
  statusReturnedBg: "#ffebee",
  statusReturnedText: "#c62828",

  vibeRating: "#f5a623",
  vibeRatingEmpty: "#e5e5e5",
  vibeQuotaOk: "#27a35f",
  vibeQuotaWarn: "#f5a623",
  vibeQuotaDanger: "#c62828",
  vibeSandboxBg: "#1a1a1a",
  vibeChatUserBg: "#f2f9ff",

  bankPositive: "#27a35f",
  bankNegative: "#c62828",
} as const;

export const radii = {
  card: 12,
  btn: 4,
  pill: 9999,
} as const;

/** Shadow — RN 은 iOS(shadow*) / Android(elevation) 분리. 웹의 multi-layer soft
 *  느낌을 Android 는 elevation 로, iOS 는 단일 shadow 로 근사. */
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 34,
    elevation: 6,
  },
  accent: {
    shadowColor: "#0075de",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

/** 8-role type scale. 웹 design-system.md §2 와 동일한 semantic 이름. */
export const typography = {
  display: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 } as const,
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.25 } as const,
  subtitle: { fontSize: 18, fontWeight: "600" } as const,
  section: { fontSize: 16, fontWeight: "700" } as const,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } as const,
  label: { fontSize: 13, fontWeight: "600" } as const,
  badge: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 } as const,
  micro: { fontSize: 11, fontWeight: "400" } as const,
};

/** Tap target — handoff ingest T1-1. 학생 태블릿 기준. */
export const tapMin = 44;

/** 공통 spacing scale — 4px base grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
