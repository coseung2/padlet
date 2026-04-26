// 학생 이름 입력 유효성 검증 (2026-04-26 student-portfolio 후속).
// AddStudentsModal 의 bulk paste/file 입력 + 향후 학생 이름 수정 폼에서
// 공통 사용. server-only 의존 없음 — 단위 테스트 가능.

export type ValidateNameResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

/**
 * 학생 이름 검증. 통과 시 { ok: true, name: trimmed }.
 *  1) trim 후 빈 문자열 → "이름을 입력해 주세요"
 *  2) 2글자 미만 → "이름은 두 글자 이상이어야 해요"
 *  3) 한글/영문이 한 글자도 없음 (숫자·특수문자만) → "올바른 이름을 입력해 주세요"
 */
export function validateStudentName(raw: string): ValidateNameResult {
  const name = raw.trim();
  if (!name) {
    return { ok: false, error: "이름을 입력해 주세요" };
  }
  if (name.length < 2) {
    return { ok: false, error: "이름은 두 글자 이상이어야 해요" };
  }
  // 한글(완성형 + 자모) 또는 라틴 알파벳이 한 글자라도 있어야 함
  if (!/[\u3131-\u318E\uAC00-\uD7A3a-zA-Z]/.test(name)) {
    return { ok: false, error: "올바른 이름을 입력해 주세요" };
  }
  return { ok: true, name };
}
