# BLOCKER 해소 — Path A 확정

**일자**: 2026-04-15
**해결자**: 사용자 직접 확인

## 결정

phase2 scope_decision 의 BLOCKER ("v1 parent-viewer 실제 배포 vs INBOX 미배포 가정 모순") 를 **Path A** 로 확정.

- **사용자 확인**: production DB 학부모 연결 레코드 **0건**
- **근거**: v1 라이브 사용자 부재 → INBOX 원안 ("v1 폐기 + 마이그레이션 불요") 그대로 유효
- **공수 영향**: +0일

## v1 코드 정리 처리

v1 (parent-viewer) 코드/스키마/라우트는 v2 구현 중 자연 deprecate. 별도 cleanup task 없이 v2 phase7 (coder) 산출물에 흡수:
- v1-only 라우트: v2 라우트로 대체 또는 삭제
- v1 스키마: Prisma migration 으로 누적 변경 (drop + rebuild — 사용자 0건이라 안전)
- AMENDMENT Classroom cascade revoke 는 v2 신규 모델 기준으로만 작성

## phase3 진입 가능

게이트: PASS (BLOCKER 해소). architect (phase3) 진입 가능.
