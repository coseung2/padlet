import { describe, it, expect } from "vitest";
import { validateStudentName } from "../student-name";

describe("validateStudentName", () => {
  it("정상 한글 이름 통과", () => {
    expect(validateStudentName("홍길동")).toEqual({ ok: true, name: "홍길동" });
    expect(validateStudentName("박재한")).toEqual({ ok: true, name: "박재한" });
  });

  it("정상 영문 이름 통과", () => {
    expect(validateStudentName("Min")).toEqual({ ok: true, name: "Min" });
    expect(validateStudentName("Hong Gil-dong")).toEqual({
      ok: true,
      name: "Hong Gil-dong",
    });
  });

  it("앞뒤 공백 trim 후 통과", () => {
    expect(validateStudentName("  홍길동  ")).toEqual({
      ok: true,
      name: "홍길동",
    });
  });

  it("빈 문자열 → 입력 메시지", () => {
    expect(validateStudentName("")).toEqual({
      ok: false,
      error: "이름을 입력해 주세요",
    });
  });

  it("공백만 → 입력 메시지", () => {
    expect(validateStudentName("   ")).toEqual({
      ok: false,
      error: "이름을 입력해 주세요",
    });
    expect(validateStudentName("\t\n")).toEqual({
      ok: false,
      error: "이름을 입력해 주세요",
    });
  });

  it("한 글자 → 두 글자 이상 메시지", () => {
    expect(validateStudentName("박")).toEqual({
      ok: false,
      error: "이름은 두 글자 이상이어야 해요",
    });
    expect(validateStudentName("A")).toEqual({
      ok: false,
      error: "이름은 두 글자 이상이어야 해요",
    });
  });

  it("숫자만 → 올바른 이름 메시지", () => {
    expect(validateStudentName("12345")).toEqual({
      ok: false,
      error: "올바른 이름을 입력해 주세요",
    });
  });

  it("특수문자만 → 올바른 이름 메시지", () => {
    expect(validateStudentName("!!!!")).toEqual({
      ok: false,
      error: "올바른 이름을 입력해 주세요",
    });
    expect(validateStudentName("**~~")).toEqual({
      ok: false,
      error: "올바른 이름을 입력해 주세요",
    });
  });

  it("숫자+특수문자만 → 올바른 이름 메시지", () => {
    expect(validateStudentName("123!@#")).toEqual({
      ok: false,
      error: "올바른 이름을 입력해 주세요",
    });
  });

  it("한글이 한 글자라도 있으면(+길이 통과) 통과", () => {
    expect(validateStudentName("박1")).toEqual({ ok: true, name: "박1" });
    expect(validateStudentName("박12")).toEqual({ ok: true, name: "박12" });
  });
});
