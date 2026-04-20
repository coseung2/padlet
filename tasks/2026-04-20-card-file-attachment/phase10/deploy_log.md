# Deploy Log — card-file-attachment

## 1. 머지 정보

- **브랜치**: `feat/card-file-attachment` → `main` fast-forward
- **커밋**: `c9a6600 feat(card-file-attachment): 카드에 문서 파일 첨부 + PDF 인라인 뷰어`
- **SHA 범위**: `3423236..c9a6600`
- **머지/푸시 시각**: 2026-04-20 KST (사용자 집 밖 세션)

## 2. 배포 파이프라인

- **CI/CD**: Vercel 자동. `main` push 이벤트가 프로덕션 빌드 트리거
- **빌드 명령**: `prisma migrate deploy && next build`
  - `prisma migrate deploy`: 새 마이그레이션 `20260420_add_card_file_attachment` 적용 (Supabase PostgreSQL `ap-northeast-2`)
  - `next build`: 새 코드 번들
- **스키마 변경**: 4개 nullable 컬럼 추가(`fileUrl/fileName/fileSize/fileMimeType`). 기존 쿼리 호환 (Prisma 클라이언트가 SELECT 목록 확장하나 기존 컬럼은 무변화).

## 3. 배포 중 리스크 · 완화

| 리스크 | 완화 |
|---|---|
| 신규 컬럼 추가 중 DB 쓰기 경합 | ALTER TABLE ADD COLUMN NULL은 Postgres 논블로킹. 사용자 수 수준에서 무시 가능. |
| 새 코드가 구 스키마 쿼리할 창 | Vercel은 DB 마이그레이션 이후 앱 배포. 시간 간격 < 30초. |
| Blob 객체 누수 (업로드 테스트 잔재) | 없음 — 업로드 실패 시 Blob 생성 전에 400 반환. |

## 4. 사용자 검증 (프로덕션)

집 도착 후 수행 권장 (phase9 qa_log.md §수동 QA 체크리스트 참조):

1. 보드 생성/진입 → `+ 카드 추가` → `📎 파일`
2. PDF·DOCX·XLSX 각 1회 업로드 + 렌더 확인
3. 10MB+ PDF 시 경고 배너 동작 확인
4. iOS Safari에서 fallback 동작 확인

## 5. 롤백 절차

### 즉시 (Vercel 대시보드)
`vercel.com/[team]/padlet/deployments` → 직전 배포(`3423236`) 항목 → `Promote to Production`

### Git 롤백
```bash
git -C padlet revert --no-edit c9a6600
git -C padlet push origin main
```

**주의**: DB 마이그레이션은 revert 시 자동 롤백 안 됨(컬럼 삭제는 수동 필요). 하지만 추가 컬럼이라 코드 롤백만으로도 기존 기능 복구됨 (null 컬럼은 무시됨).

### 트리거 조건
- 카드 추가 플로우에서 500 에러
- 기존 이미지/동영상 렌더 회귀
- Blob 쿼리 비정상 증가(Vercel Analytics 모니터)
