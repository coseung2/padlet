# Aura-board Mobile (Expo)

학생 태블릿(Galaxy Tab S6 Lite 가로 2000×1200) 우선 타겟.

## 📦 APK 받기 (테스트용)

GitHub Actions 가 자동으로 APK 를 빌드한다. 최초 1회 셋업은 [SETUP.md](./SETUP.md) 참조.

- 설정 완료 후: main 에 `apps/mobile/` 커밋이 들어가면 자동 빌드
- 또는 GitHub > Actions > **Mobile APK Build (EAS Preview)** > Run workflow
- 10-20분 뒤 expo.dev 에서 APK 다운로드

## 빠른 실행 (Android 에뮬레이터)

```
cd apps/mobile
npm run android
```

- Expo Go (SDK 54) 가 설치된 에뮬레이터/실기기가 자동 감지됨
- Metro 번들러가 기동되면 에뮬레이터에 JS 번들 push → 앱 자동 실행
- 코드 수정 시 Fast Refresh 로 즉시 반영

### 에뮬레이터 권장 AVD

- Device: **Galaxy Tab S6 Lite** (또는 Pixel Tablet / 10.4" 커스텀)
- Resolution: 2000 × 1200
- Orientation: **Landscape** (앱 자체가 가로 고정이므로 portrait 로 켜도 앱이 가로로 강제함)
- Android 13+ 권장

### Expo Go 연결

1. Android Studio 에뮬레이터에서 Play Store 로그인 → Expo Go 설치
2. `npm run android` 가 자동으로 Expo Go 에 빌드 주입

## Dev 빌드(권장, 지속 프리뷰)

네이티브 모듈(expo-camera 등)이 늘어나면 Expo Go 만으로 부족 — Dev Client 빌드 한 번:

```
npx eas login             # 최초 1회
npx eas build:configure   # EAS 프로필 생성
npx eas build --profile development --platform android
```

- 빌드 완료 후 APK 를 에뮬레이터에 drag-drop 설치
- 이후부터는 `npm start` → 에뮬레이터의 Aura-board Dev 앱 실행 → JS 변경 즉시 반영
- 네이티브 모듈 추가 시에만 재빌드 필요

## 현재 구현된 화면 (mockup, 실 API 미연동)

| Route | 설명 |
|---|---|
| `/` | `/(student)/login` 으로 redirect |
| `/(student)/login` | QR + 6자리 코드 입력 로그인 |
| `/(student)/` | 오늘의 보드 4-col 그리드 |
| `/(student)/board/[slug]?layout=vibe-arcade` | 코딩 교실 — 슬롯 그리드 / 카탈로그 탭 + FAB |
| `/(student)/board/[slug]?layout=other` | placeholder |

## 디자인 토큰

`theme/tokens.ts` 에 웹 `src/styles/base.css` 의 CSS 변수 1:1 포팅.
`--color-accent #0075de`, `--radius-card 12`, `--font-display Inter` 등
시각적 동일성 유지. 양쪽 동기화는 추후 `packages/shared/` 추출 대상.

## 폴더 구조

```
apps/mobile/
├── app.json               # orientation: landscape, tablet 지원
├── app/                   # expo-router file-based
│   ├── _layout.tsx        # Stack + SafeAreaProvider
│   ├── index.tsx          # → /(student)/login
│   └── (student)/
│       ├── _layout.tsx
│       ├── login.tsx      # 로그인
│       ├── index.tsx      # 학생 대시보드
│       └── board/
│           └── [slug].tsx # 보드 상세 (layout query)
├── components/
│   └── VibeArcadeMock.tsx # 코딩 교실 UI
├── theme/
│   ├── tokens.ts          # 컬러·radius·shadow·타이포
│   └── layout-meta.ts     # 14개 레이아웃 emoji/label
└── assets/                # 아이콘·스플래시 (생성된 기본값)
```

## 후속 작업 (시안 다음 단계)

- [ ] 실 API 연동: `/api/student/login`, `/api/student`, `/api/vibe/*`
- [ ] expo-camera 추가 → QR 스캐너 실동작 (Dev Client 필요)
- [ ] 웹과 shared 토큰 모듈 추출 (`packages/shared-tokens`)
- [ ] 퀴즈 / 과제 배부 / 주제별 보드 mockup
- [ ] Deep link: `auraboard://board/xxx` 지원 (expo-linking 이미 설치됨)
- [ ] Push notification (교사 승인 알림 등) — expo-notifications
