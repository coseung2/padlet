# Embed Research — 보드에 붙일 만한 외부 콘텐츠 후보

> 2026-04-12 병렬 웹서치 (6쿼리) 결과 요약. 캔바 이후 확장 후보 보관용.
> 현 이슈 아님 — 다음 feature task 후보 저장소.

## Tier별 후보

### S-tier (즉시 쓰일 것)
| 후보 | 카테고리 | 구현 난이도 |
|---|---|---|
| Google Slides / Docs / Sheets / Forms | 문서 | 낮음 (공개 URL → iframe) |
| Figma / FigJam (공개) | 디자인·협업 | 낮음 (embed URL) |
| Notion 공개 페이지 | 학습 허브 | 낮음 (iframe) |

### A-tier (특정 과목에서 강력)
| 후보 | 카테고리 | 구현 난이도 |
|---|---|---|
| Desmos | 수학 그래프 | 낮음 (공식 embed) |
| GeoGebra | 수학·기하 | 낮음 (공식 iframe) |
| Genially | 인터랙티브 학습 | 낮음 (iframe) |
| Wakelet | 콘텐츠 큐레이션 | 낮음 (iframe) |

### B-tier (니치지만 확실)
| 후보 | 카테고리 | 구현 난이도 |
|---|---|---|
| Vimeo / Loom | 영상 | 낮음 |
| CodeSandbox / StackBlitz / CodePen / Replit | 코드 | 낮음 |

### C-tier (현재 보드와 중복)
- Wordwall / Quizlet / Kahoot — 우리 퀴즈 보드와 겹침
- Spotify / SoundCloud — 유즈케이스 제한

## 구현 패턴

| 패턴 | 대상 | 구현 |
|---|---|---|
| A. URL 패턴 감지 → iframe URL 변환 | YouTube(구현됨), Vimeo, Loom, Figma, Desmos, GeoGebra, CodeSandbox, CodePen, StackBlitz, Genially, Spotify | `CardAttachments.tsx` 분기 + `lib/embed-url.ts` |
| B. Google 계열 자동 embed | Slides/Docs/Sheets/Forms | `/pub?embedded=true` 또는 `/embed` URL 변환 |
| C. Notion public embed | Notion | notion.so/xxx → notion.site 공개 iframe |
| D. OAuth + API | Figma private, Notion private, Miro | Canva 와 동일 수준 별도 트랙 |

## 후속 제안

P0-① Canva oEmbed 완료 시 파생 재사용 가능:
- Canva iframe 분기 로직 → 10+ 플랫폼에 확장 가능 (패턴 A/B/C)
- 단일 feature task "Generic oEmbed Expansion" 로 묶어 처리 권장

## Sources

- https://www.classpoint.io/blog/digital-tools-for-the-classroom
- https://blog.messagear.com/best-canva-alternatives-in-2026-design-tools-compared/
- https://genially.com/
- https://edzip.kr/ (한국 교사 에듀테크 플랫폼)
- https://dunoit.com/blogs/top-100-64b20f982f499
- https://classroomscreen.com/blog/embedding-in-classroomscreen
- https://www.desmos.com/
- https://www.g2.com/products/padlet/competitors/alternatives
- https://miro.com/al/padlet-alternatives/
- https://clickup.com/blog/loom-vs-vimeo/
- https://codesandbox.io/docs/embedding
- https://codesandbox.io/blog/how-codesandbox-empowers-coding-educators-and-students

## 참고 (한국 컨텍스트)

- **잇다 (ITDA)** 서비스는 2026-02-27 종료
- 교사 사이 주류: Google 계열, 노션, 패들렛, 아이톡톡
- AI·디지털 교육자료 포털 = KERIS 관리
