# Phase 0 — Requirements (analyst)

## Problem statement
교사가 학생에게 실시간 공동작업 그림판(Drawpile 기반)을 제공하고, 학생이 생성한 자산(그림/업로드 이미지)을 라이브러리로 관리하여 기존 카드형 보드(freeform, plant-roadmap 등)에 재사용할 수 있도록 한다. 본 태스크는 **외부 인프라 의존 부분을 제외한** 스키마·라우팅·UI 스텁 레이어만 구현한다.

## In-scope (partial, 자율 가능)
- Prisma 스키마 확장 (StudentAsset, AssetAttachment + 관계)
- Board.layout 'drawing' 지원 (zod 검증 포함)
- `/board/[id]` 에서 drawing 레이아웃 분기 → DrawingBoard.tsx
- DrawingBoard shell: 작업실 탭(iframe 또는 안내 카드) + 갤러리 탭(공유 썸네일 그리드 빈 상태)
- StudentLibrary sidebar: 학생 본인 자산 목록 + 업로드
- POST /api/student-assets: 멀티파트 업로드 → Blob/FS → StudentAsset
- AddCardModal '내 라이브러리' 버튼 → 자산 픽커 → AssetAttachment 생성 + Card.imageUrl 주입
- docs/drawpile-protocol.md: postMessage 계약 문서
- BLOCKERS.md: 외부 블로커 목록

## Out-of-scope (blocked by external infra → BLOCKERS.md)
- Drawpile 서버 호스팅 + 포크 레포 생성
- COOP/COEP 라이브 검증 (next.config.ts 부분 적용은 가능하나 Drawpile iframe 없이는 end-to-end 확인 불가)
- postMessage bridge 실제 구현 (Drawpile fork 패치 필요)
- 공유 플래그 토글/공개 링크
- Hetzner/Fly 헬스체크, 규모 스트레스 테스트

## Users & goals
- 교사: drawing 레이아웃으로 보드 생성 → 학생에게 공유. 갤러리 탭으로 제출물 확인.
- 학생: 작업실에서 그림 작업 → 완료 후 자동/수동 라이브러리 저장 → 다른 카드 보드에서 첨부.

## Success metric (phase2 수용 기준에서 구체화)
- 빌드/타입체크 PASS
- 로컬에서 drawing 레이아웃 보드 생성/라우팅 성공
- 업로드-라이브러리-카드 연결 경로 PASS
- iframe src env 미설정 시 placeholder UI 정상

## 위험 신호 (strategist 에서 deep dive)
- GPL-3.0 라이선스 격리 (Drawpile fork 레포 분리)
- Cross-Origin Isolation 깨짐 (다른 iframe 기능 영향)
- 업로드 경로 보안 (학생 세션 인증)
- 디바이스 성능(S6 Lite) — iframe 로딩 & 썸네일 그리드

## Assumptions
- 스토리지: 기존 `/api/upload` 와 동일 패턴 (public/uploads FS or Vercel Blob 이후 마이그)
- 인증: 학생은 student-auth 쿠키, 교사는 NextAuth
- 모든 StudentAsset 는 classroom 스코프로 격리됨 (RLS 수준은 app 계층에서만)
