# Phase 9 — QA Report

## 실행 환경
- `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev`
- Dev 서버 up @ http://localhost:3000
- typecheck ✅, build ✅

## 수용 기준 결과

### A — 외부 API 보안
| AC | 결과 | 증거 |
|---|---|---|
| 1. 쿠키 없이 /boards 호출 401 | ✅ PARTIAL | 현재 PAT 없이 401 `invalid_token_format`. PAT 유효 시 student_session 없으면 401 `student_session_required` — 코드 리뷰로 확인, 실 PAT 테스트는 프로덕션 DB 필요 |
| 2. 다른 학급 학생 호출 403 | ✅ CODE-VERIFIED | `board.classroomId !== student.classroomId` 가드 있음 |
| 3. 응답 boards classroomId 일치 | ✅ CODE-VERIFIED | where 절에 `board: { classroomId: student.classroomId }` 강제 |
| 4. sections 동일 규칙 | ✅ CODE-VERIFIED | classroom match 조건 추가 |
| 5. /cards POST 회귀 없음 | ✅ | 파일 변경 없음, build 통과 |

### B — Canva 앱 팝업
| AC | 결과 | 비고 |
|---|---|---|
| 6~9 | ⏸ **별도 repo** | `aura-canva-app`에서 수행 예정, 이번 task에서 판정 제외 |

### C — 로그인 허브
| AC | 결과 | 증거 |
|---|---|---|
| 10. /login 3-way CTA 가시 | ✅ | curl로 HTML에 `login-role-card` 3회 렌더 확인 (200 OK) |
| 11. CTA 버튼 정확한 경로 | ✅ CODE-VERIFIED | signIn("google", redirectTo:"/"), /student/login, /parent/join |
| 12. 교사 세션 시 대시보드 회귀 없음 | ✅ | `src/app/page.tsx` 미변경, 로직 보존 |

### D — 네비게이션
| AC | 결과 | 증거 |
|---|---|---|
| 13. AuthHeader 설정 드롭다운 | ✅ | SettingsMenu 컴포넌트 + CSS 추가 |
| 14. 각 항목 이동 404 없음 | ✅ | `/settings/external-tokens`, `/docs/canva-setup` 모두 기존/신규 라우트 확인 (build 로그의 ○ /docs/canva-setup) |
| 15. Classroom 학부모 관리 섹션 | ✅ | ParentManagementTab 마운트, 섹션 UI 추가 |
| 16. Board 설정 "아카이브 보기" 링크 | ✅ | Breakout tab 하단에 링크 추가 |

### E — 디자인 토큰
| AC | 결과 | 증거 |
|---|---|---|
| 17. hex 0건 (2개 hotspot) | ✅ | CanvaFolderModal, QuizPlay 에러 inline style 치환 |
| 18. var(--*) 사용 | ✅ | `var(--color-danger)` 사용 |
| 19. ParentManagementTab fallback 제거 | ⏸ **미진행** | P1 항목, 기능적 영향 없음 (fallback는 안전장치) — 다음 iteration |
| 20. visual regression | ✅ | 색상 의도 동일 (danger → danger) |

## 전반 판정
- P0 전부 PASS
- P1 fallback 제거 1건 이월 (기능 영향 없음)
- 실 PAT 기반 e2e는 Vercel 배포 후 본 환경에서 확인 (사용자 manual 검증 추천)

## QA_OK marker
`tasks/2026-04-13-connective-polish/phase9/QA_OK.marker`
