# Regression tests — canva-oembed

자동 e2e 테스트 프레임워크가 없는 프로젝트 컨벤션 상, 회귀 방지는 두 계층으로 구성:

## 1. 유닛 테스트 (자동)

`src/lib/__tests__/canva-embed.test.ts` — 18 table-based 테스트. 실행:

```bash
npx tsx src/lib/__tests__/canva-embed.test.ts
```

이 테스트는 `isCanvaDesignUrl` + `extractCanvaDesignId` 의 URL 패턴 매칭을 검증한다. 향후 URL 형식 변화나 정규표현식 수정에 대한 회귀를 잡는다.

## 2. 수동 smoke (수용 기준 기반)

`phase9/qa_report.md #수동-검증-체크리스트-배포-후-수행` 참조. 10개 체크리스트.

## 3. Vitest/Playwright 도입 시 이식 가이드

```ts
// 유닛: 그대로 벡터 복붙
describe('isCanvaDesignUrl', () => {
  test.each(isCanvaCases)('$name', ({ input, expected }) => {
    expect(isCanvaDesignUrl(input)).toBe(expected);
  });
});

// 통합: POST/PATCH 테스트 (MSW + fetch mock)
// resolveCanvaEmbedUrl 을 세 경로(success, timeout, private) 모킹
// after setup, hit /api/cards with Canva URL and assert response shape.
```

도입 시 phase7 `tests_added.txt` 의 "Integration / E2E (DEFERRED)" 항목을 이 디렉토리 하위로 이관.
