"use client";

import type { PortfolioRosterStudentDTO } from "@/lib/portfolio-dto";

type Props = {
  classroomName: string;
  students: PortfolioRosterStudentDTO[];
  selectedStudentId: string | null;
  selfStudentId: string | null;
  onSelect: (studentId: string) => void;
};

export function PortfolioRoster({
  classroomName,
  students,
  selectedStudentId,
  selfStudentId,
  onSelect,
}: Props) {
  return (
    <aside
      className="portfolio-roster"
      aria-label={`${classroomName} 학생 명단`}
    >
      <header className="portfolio-roster-head">
        <h2 className="portfolio-roster-title">{classroomName}</h2>
        <span className="portfolio-roster-count">{students.length}명</span>
      </header>
      {students.length === 0 ? (
        <p className="portfolio-roster-empty">학급에 등록된 학생이 없어요.</p>
      ) : (
        <ul className="portfolio-roster-list" role="listbox">
          {students.map((s) => {
            const isSelf = s.id === selfStudentId;
            const isSelected = s.id === selectedStudentId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={[
                    "portfolio-roster-item",
                    isSelf ? "is-self" : "",
                    isSelected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${s.name}${
                    s.number != null ? `, 출석번호 ${s.number}` : ""
                  }, 작품 ${s.cardCount}개${
                    s.showcaseCount > 0 ? `, 자랑해요 ${s.showcaseCount}개` : ""
                  }${isSelf ? ", 본인" : ""}`}
                  onClick={() => onSelect(s.id)}
                >
                  {isSelf && (
                    <span className="portfolio-roster-self-dot" aria-hidden>
                      🟢
                    </span>
                  )}
                  <span className="portfolio-roster-num">
                    {s.number ?? "—"}
                  </span>
                  <span className="portfolio-roster-name">{s.name}</span>
                  <span
                    className={`portfolio-roster-count-badge ${
                      s.cardCount === 0 ? "is-zero" : ""
                    }`}
                  >
                    {s.cardCount}
                  </span>
                  {s.showcaseCount > 0 && (
                    <span
                      className="portfolio-roster-showcase"
                      aria-label={`자랑해요 ${s.showcaseCount}개`}
                      title={`자랑해요 ${s.showcaseCount}개`}
                    >
                      🌟
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
