# Scope Decision — multi-attachment

## 1. 선택한 접근

**정규화 `CardAttachment` 테이블 + 레거시 singleton 필드 호환 fallback 렌더**.

- 새 테이블 `CardAttachment { id, cardId, kind, url, fileName?, fileSize?, mimeType?, order }` 추가
- `kind` 열거: `"image" | "video" | "file"` (링크는 기존 `linkUrl` 유지, 단일)
- 기존 `Card.imageUrl/videoUrl/fileUrl/fileName/fileSize/fileMimeType` 필드는 **건드리지 않음** (백필 없음, 기존 쿼리·렌더 경로 보존)
- 신규 카드는 `CardAttachment` 행으로만 저장
- 렌더 로직: `attachments` 배열이 비어있으면 기존 singleton 필드 렌더 (backward-compat)

대안 비교:
- JSON 배열 컬럼: 정규화 잃음, 개별 제거 쿼리 불편
- singleton + extra JSON: 이중 상태·비대칭. 모달 UX 꼬임
- 마이그레이션 즉시 singleton 드롭: 다른 경로(AssignmentSlot, parent viewer 등) 회귀 위험 높음 — 후속 task

## 2. MVP 범위

### 포함 (IN)

- **DB**: `CardAttachment` 테이블 migration. 기존 singleton 필드 무변경.
- **API POST `/api/cards`**: `attachments: Array<{ kind, url, fileName?, fileSize?, mimeType? }>` 필드 수용. 트랜잭션으로 Card + CardAttachment[] 생성.
  - `fileUrl` 기반 보안 검증(`isAllowedFileUrl`, `isAllowedStoredMime`)을 attachments에 모두 적용
- **SSE stream + cardProps**: `CardWire`에 `attachments: Array<{ id, kind, url, fileName, fileSize, mimeType, order }>` 포함
- **렌더(`CardAttachments`)**: `attachments` prop을 iterate. 비었으면 기존 singleton props로 fallback.
- **AddCardModal**:
  - 이미지/동영상/파일 input을 `multiple` 지원, 선택 즉시 순차 업로드
  - 각 업로드는 `attachments[]` state에 append
  - 섹션은 토글 OFF 후에도 업로드된 항목 preview 리스트 유지
  - 각 항목 개별 제거 버튼
  - 제출 시 attachments[] 전체를 payload로 전송
- **CardDetailModal**: media section이 attachments 수에 맞춰 세로 스택 (현재 레이아웃 그대로, 자식만 loop)
- **타입**: `CardData`에 `attachments?: AttachmentWire[]` optional

### 제외 (OUT)

- **PATCH 편집**: 카드 수정 시 첨부 추가/제거 — 후속 task (EditCardModal은 제목/내용/색상/링크만 건드림)
- **백필 마이그레이션**: 기존 카드의 singleton 필드를 CardAttachment 행으로 복사. fallback 렌더로 대체. 향후 singleton 필드 deprecate 시 back-fill 필요.
- **멀티 링크**: `linkUrl` 단일 유지. 여러 링크 미니 카드는 별도 task.
- **CardAttachment 재정렬 drag-drop**: MVP는 업로드 순서(order) 고정. 드래그 재정렬은 후속.
- **AssignmentBoard/AssessmentBoard/DrawingBoard 등** 고유 입력 플로우: 이번 범위 밖 (AddCardModal 사용하지 않음).

## 3. 수용 기준

1. **AC-1**: AddCardModal에서 이미지 토글 → 파일 input multiple → 3장 동시 선택 → 3개 업로드 병렬/순차 진행, 각 썸네일 preview + 개별 제거 버튼 노출
2. **AC-2**: 파일 토글 → 여러 문서 선택 → 각 파일 아이콘 + 이름 + 크기 프리뷰 리스트. 제거 시 즉시 UI 반영.
3. **AC-3**: 카드 생성 POST 응답 후 카드에 attachments 배열 포함, 각 항목이 `CardAttachment` 테이블에 저장됨 (쿼리로 확인 가능)
4. **AC-4**: 기존 single-attachment 카드(attachments 없음)의 CardAttachments 렌더는 기존과 동일 (회귀 없음)
5. **AC-5**: CardDetailModal에서 multi-attachment 카드 열면 모든 첨부가 세로 스택으로 노출
6. **AC-6**: SSE snapshot이 attachments 배열 포함 (다른 사용자 클라이언트도 multi 카드 정상 표시)
7. **AC-7**: 업로드 중 하나 실패해도 나머지는 저장됨 (per-file upload isolation)
8. **AC-8**: 업로드된 파일 URL의 isAllowedFileUrl 서버 검증은 attachments의 kind=file 항목 모두 통과해야 함 (stored-XSS 차단)
9. **AC-9**: 기존 유닛 테스트(file-attachment / card-permissions / card-authors-service) 전부 통과
10. **AC-10**: `npx tsc --noEmit` + `npx next build` 성공

## 4. 스코프 결정 모드

**Expansion** — 새 테이블·새 API shape·새 UI 다중 선택 경로. 기존 경로는 fallback으로 보존.

## 5. 위험 요소

- **R1 — 기존 singleton 경로 회귀**: 렌더/쿼리에서 `imageUrl/videoUrl/fileUrl` 직접 참조하는 레거시 코드(AssignmentSlot 등) 다수. 완화: fallback 렌더 + singleton 필드 **스키마 유지**. 쓰기 경로만 attachments[] 우선.
- **R2 — 업로드 동시성**: 브라우저가 N개 파일 동시 업로드 시 `/api/upload` 레이트·메모리. 완화: 클라이언트가 순차 업로드(Promise chain) — 병렬 대신 UX 단순화.
- **R3 — attachment 배열 크기 상한 부재**: 무제한 시 DB 행 폭증. 완화: MAX_ATTACHMENTS_PER_CARD=10 상수 + Zod max + UI disable.
- **R4 — SSE payload 비대**: attachments 10개 × 카드 수 → snapshot 크기 증가. 완화: 카드 1개당 10개 상한 + 필수 필드만(no base64).
- **R5 — 고아 CardAttachment**: 업로드 성공 후 카드 POST 실패 시 Blob에 파일만 남고 DB 행 없음. 완화: 기존 /api/upload도 동일 문제, accept as known. 청소 스크립트는 별도 task.
- **R6 — UI 첨부 섹션 토글 OFF 시 상태 소실 혼란**: 사용자가 이미지 섹션을 닫아도 이미 업로드된 이미지는 유지되어야 제출 시 포함. 완화: section toggle은 UI 표시만 제어, state는 상시 유지. 배지로 "이미지 3개 첨부됨" 표시.

## 오케스트레이터 스코프 검증 (자동)

- ✅ 수용 기준 10개
- ✅ 리스크 6개
- ✅ IN/OUT 분리
- ✅ 모드 명시

**PASS → phase7 구현 진행.**
