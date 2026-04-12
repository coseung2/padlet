# Aura-board Drawpile 그림보드 — External Blockers

Schema + UI stub 구현 (`tasks/2026-04-13-drawpile-schema-stub/`) 은 완료. 아래 항목은 **외부 인프라 / 사람 수행 작업** 이라 이 task 범위 밖에 있으며, 완료되는 즉시 그림보드 레이아웃이 end-to-end 로 동작한다.

---

## 1. Drawpile GPL-3.0 fork 레포 생성
- **누가**: 운영자 (사용자)
- **무엇**: GitHub 에 별도 조직 레포 생성 — 제안 이름 `aura-board/drawpile-fork`.
- **왜**: Drawpile 은 GPL-3.0. Aura-board 메인 레포는 독점이므로 소스 코드 격리가 필요. iframe-only 통합이라 링크는 GPL-전염을 발생시키지 않지만, 포크 작업이 필요하므로 레포를 분리.
- **참조**: https://github.com/drawpile/Drawpile
- **완료 조건**: 포크 레포 url 공유 + README 에 "Fork of Drawpile — modifications licensed GPL-3.0" 표기.

## 2. Drawpile 서버 자체 호스팅
- **누가**: 운영자 (사용자)
- **옵션**:
  - Railway — 가장 빠름. `Dockerfile` 기반 deploy.
  - Fly.io — regions:icn, 관리 편함. Supabase `ap-northeast-2` 와 근접.
  - Hetzner — 가장 저렴. ssh 수동 관리.
- **env 출력**: `DRAWPILE_SERVER_URL` (백엔드), `NEXT_PUBLIC_DRAWPILE_URL` (프론트 iframe src).
- **도메인**: `drawpile.aura-board.app` (CNAME 연결).
- **완료 조건**: `NEXT_PUBLIC_DRAWPILE_URL` 을 Vercel Project Settings > Environment Variables 에 등록 → 재배포 → `DrawingBoard` 가 iframe 을 로드하는지 육안 확인.

## 3. Cross-Origin-Isolation (COOP/COEP) 헤더
- **누가**: 코드 일부 + 운영자 검증
- **무엇**: Drawpile 은 SharedArrayBuffer 기반 wasm 스레드를 사용 → 부모(Aura-board) 또는 자식(Drawpile 서버) 중 하나에 다음 헤더 필요.
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- **이 task 에서 하지 않은 이유**: Aura-board 의 `/board/[id]` 모든 레이아웃에 헤더를 거는 순간 Canva oEmbed, Youtube embed, 기존 iframe 이 깨질 수 있음 (COEP require-corp 의 cross-origin 리소스 전염).
- **권장 전략**: drawing 레이아웃 **전용 라우트** 로 분리 (`/board/[id]/drawing`) 하거나, next.config.ts 에 `headers()` matcher 로 `/drawing-iframe-host` path 한정 적용. 서버 확보 후 결정.
- **완료 조건**: Drawpile 서버 접속 시 `window.crossOriginIsolated === true` 확인.

## 4. postMessage bridge 패치 (Drawpile fork)
- **누가**: 운영자 또는 컨트리뷰터
- **무엇**: Drawpile fork 의 저장 액션에서 아래 메시지를 `window.parent.postMessage` 로 emit.
  - `drawpile:ready` (boot 시 1회)
  - `drawpile:save` (저장 완료 시)
  - `drawpile:error` (실패 시)
- **스펙**: `docs/drawpile-protocol.md`.
- **연동 포인트**: Aura-board 측은 이 task 에서 핸들러를 구현하지 **않았다** (fork 패치 shape 확정 후 다른 task 에서 `DrawingBoard.tsx` 에 listener 추가 + `POST /api/student-assets/ingest` 신설).

## 5. Prisma 마이그레이션 적용 (Supabase)
- **누가**: 운영자
- **무엇**: `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql` 을 Supabase prod DB 에 적용.
- **방법**: Supabase Dashboard > SQL Editor 에 붙여넣고 run, 또는 `supabase apply_migration` MCP 도구로 실행.
- **완료 조건**: `StudentAsset`, `AssetAttachment` 테이블이 Supabase 에 존재하고 FK/index 가 보임.

## 6. (선택) 영구 스토리지 업그레이드
- **현재**: `/api/student-assets` 는 기존 `/api/upload` 와 동일하게 `public/uploads/` 에 쓴다 (Vercel serverless FS 는 읽기 전용 → **프로덕션 영속성 없음**). 로컬 dev 에서만 완전 동작.
- **작업**: `@vercel/blob` 또는 Supabase Storage 로 업로드 경로 교체. `/api/upload` 와 함께 일괄 마이그레이션 권장 (별도 task).
- **완료 조건**: 프로덕션에서 업로드 후 이미지 URL 이 배포 재시작 후에도 유효.

---

## Post-blocker 재개 체크리스트
1. Supabase 마이그레이션 적용 (#5)
2. Drawpile fork + 서버 배포 (#1, #2)
3. env `NEXT_PUBLIC_DRAWPILE_URL` 등록
4. DrawingBoard placeholder 가 iframe 으로 교체되는지 확인
5. 스토리지 업그레이드 task 착수 (#6)
6. postMessage handler task 착수 (#4, #3 동반)
