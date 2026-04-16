# Phase 5 — UI Design Spec (Event-signup)

## Teacher /board/[id]/event/edit
```
┌ 행사 설정  [ 저장 & 발행 ]  ← sticky top-right
├ 섹션 1 "기본 정보"
│   - 포스터 이미지 URL or 업로드 (기존 CardAttachments upload 재사용)
│   - 장소, 선발 인원, 신청 시작/종료, 행사 시작/종료 (datetime-local, Asia/Seoul 표시)
├ 섹션 2 "신청 폼"
│   - 기본 필드 토글: 이름 / 학년·반 / 번호 / 연락처 (askXxx booleans)
│   - 팀 신청 허용 + 최대 인원
│   - [+] 커스텀 문항 추가 (type: text/long/select/radio/checkbox) — 드래그 순서 변경
├ 섹션 3 "영상"
│   - 정책: 선택/필수/없음
│   - 허용 플랫폼: [v] YouTube  [ ] Cloudflare Stream (env 설정 시만 활성)
│   - 최대 길이(초), 최대 용량(MB)
├ 섹션 4 "심사 & 발표"
│   - 승인 필요 모드 toggle
│   - 발표 모드: public-list / private-search / private
└ 공유 카드 (읽기 전용, 하단 고정)
    [ QR (SVG 128px) ]  링크: https://.../b/{slug}?t={token}  [복사] [토큰 재발급]
```

## Public /b/[slug] (signup form)
```
┌ 포스터 이미지 (16:9, 상단 풀폭)
├ 행사 타이틀 (h1)
├ 일정/장소/정원 요약 (3칼럼 태블릿, 1칼럼 모바일)
├ ⚠ 마감 임박 배너 (조건부)
├ 신청 폼
│   [이름]             ← askName
│   [학년] [반] [번호]  ← 3열 inline (모바일 2+1)
│   [연락처]           ← askContact
│   ─── 팀 구성 ───    ← allowTeam ON 시
│   [팀명] / 멤버 2명 이상
│   ─── 질문 ───
│   { customQuestions JSON 순회 → type별 input }
│   ─── 영상 ───       ← videoPolicy !== "none"
│   ○ YouTube 링크 [URL]
│   ○ 파일 업로드 (CF Stream 활성 시)
│   ─── hCaptcha ───   ← sitekey 있을 때만
│   [ 제출 ]           ← full-width sticky bottom on mobile
└ 제출 후 카드 (모달)
    "신청 완료!  확인 토큰: xxxxxxxxxxxxxxxxxxxxx  [복사]"
    "이 토큰으로 /my 페이지에서 수정할 수 있습니다."
```

## Public /b/[slug]/my
- 상단: 상태 배지 (대기/승인됨/반려) + submittedAt
- 중간: 제출 요약 (읽기 전용 필드)
- 하단: `마감 전 + status in (pending_approval, submitted)` → [ 수정 ] 버튼 → 인라인 편집 모드 진입

## Public /b/[slug]/result
- **public-list**: 합격자 이름 그리드 (알파벳/가나다 정렬, 3열 태블릿)
- **private-search**: 이름 + 학번 입력 후 "조회" → "합격/불합격/미결정" 응답
- **private**: "결과는 개별 연락 드립니다" 안내 카드

## Teacher /board/[id]/event/review
```
┌ 필터 바: [전체] [승인대기] [접수됨] [승인됨] [반려]  + 검색(이름/학번)
├ 좌측 리스트 (40%)
│   [카드 1] 이름 · 학년·반·번호 · 상태 배지 · 점수 평균 · 영상 썸네일(있으면)
│   [카드 2] ...
│   content-visibility: auto; min-height: 88px
└ 우측 드로어 (60%)
    - 제출 상세 (모든 필드)
    - 영상 플레이어 (iframe or <video>)
    - 심사자 점수 패널: 기존 점수 리스트 + "내 점수/코멘트" 입력
    - 하단 액션 바: [반려] [승인대기 유지] [승인] [삭제]
```

## QrShareCard 컴포넌트
- SVG QR 128×128
- URL 한 줄 + [복사]
- [토큰 재발급] 버튼 → confirm("이전 QR이 무효화됩니다. 계속할까요?")
- [인쇄] 버튼 → 기존 QRPrintSheet 패턴

## 디자인 토큰 (변경 없음)
기존 design-system.md 토큰 사용. 상태 배지 클래스:
- `badge-neutral` (pending_approval)
- `badge-info` (submitted)
- `badge-success` (approved)
- `badge-danger` (rejected)

## 인쇄 스타일
- QR 카드 @media print: 큰 QR + 링크 URL만.
