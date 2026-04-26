"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PortfolioCardDTO,
  PortfolioRosterDTO,
} from "@/lib/portfolio-dto";
import { PortfolioRoster } from "./PortfolioRoster";
import { PortfolioStudentView } from "./PortfolioStudentView";
import { ShowcaseLimitModal } from "./ShowcaseLimitModal";
import { useShowcaseToggle } from "./useShowcaseToggle";

type Props = {
  initialRoster: PortfolioRosterDTO;
  /** 학생 viewer 의 자기 학생 id. 교사/학부모면 null */
  selfStudentId: string | null;
  /** 학부모가 자녀 본인 페이지 진입 시: 자녀 id를 default 선택 */
  defaultStudentId: string | null;
};

export function PortfolioPage({
  initialRoster,
  selfStudentId,
  defaultStudentId,
}: Props) {
  const [roster, setRoster] = useState(initialRoster);
  // 모바일에선 좌측 학생 클릭 시 우측 stack push 패턴 — 뷰포트 폭으로 분기
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const initialStudentId =
    defaultStudentId ?? selfStudentId ?? initialRoster.students[0]?.id ?? null;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    initialStudentId
  );

  // 자식 컴포넌트의 카드 state 패치 함수 등록 (자랑해요 토글 후 동기화)
  const cardPatcherRef = useRef<((cardId: string, on: boolean) => void) | null>(
    null
  );

  function handleAfterToggle(cardId: string, on: boolean) {
    cardPatcherRef.current?.(cardId, on);
    // 좌측 로스터 자랑해요 카운트도 업데이트
    if (selfStudentId) {
      setRoster((r) => ({
        ...r,
        students: r.students.map((s) =>
          s.id === selfStudentId
            ? {
                ...s,
                showcaseCount: Math.max(
                  0,
                  s.showcaseCount + (on ? 1 : -1)
                ),
              }
            : s
        ),
      }));
    }
  }

  const { toggle, busy, limitModal, replaceWith, dismissLimit } =
    useShowcaseToggle({
      onAfterToggle: handleAfterToggle,
    });

  function onCardToggle(card: PortfolioCardDTO) {
    void toggle(card);
  }

  // 모바일 stack 모드 — 학생 선택 시 listView 숨기고 detail 만 표시
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  // 데스크톱 로스터 사이드바 토글 (DJ 재생완료 드로어 패턴). 기본 열림 —
  // 로스터가 학생 탐색 entry-point 라 닫힌 채 시작하면 사용성 ↓.
  const [rosterOpen, setRosterOpen] = useState(true);
  function selectStudent(id: string) {
    setSelectedStudentId(id);
    if (isMobile) setMobileShowDetail(true);
  }
  function backToList() {
    setMobileShowDetail(false);
  }

  if (initialRoster.students.length === 0) {
    return (
      <div className="portfolio-page is-empty">
        <div className="portfolio-empty">
          <p>학급에 등록된 학생이 없어요.</p>
        </div>
      </div>
    );
  }

  // 데스크톱: 친구 목록 열림/닫힘. 닫힘 시 토글은 page 박스 밖 viewport
  // 좌측 여백에 fixed-position 으로 떠 있음. 모바일: 기존 stack 패턴.
  const showRoster =
    isMobile ? !mobileShowDetail : rosterOpen;
  const rosterClosed = !isMobile && !rosterOpen;

  return (
    <>
      {rosterClosed && (
        <button
          type="button"
          className="portfolio-floating-toggle"
          onClick={() => setRosterOpen(true)}
          aria-label="우리 반 친구들 보기"
          aria-expanded={false}
          title="우리 반 친구들 보기"
        >
          <span aria-hidden>👥</span>
          <span>우리 반 친구들</span>
        </button>
      )}
      <div
        className={[
          "portfolio-page",
          isMobile ? "is-mobile" : "",
          isMobile && mobileShowDetail ? "is-detail" : "",
          rosterClosed ? "is-roster-closed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showRoster && (
          <PortfolioRoster
            classroomName={initialRoster.classroom.name}
            students={roster.students}
            selectedStudentId={selectedStudentId}
            selfStudentId={selfStudentId}
            onSelect={selectStudent}
            onClose={!isMobile ? () => setRosterOpen(false) : undefined}
          />
        )}
        <main className="portfolio-main">
          {isMobile && mobileShowDetail && (
            <button
              type="button"
              className="portfolio-mobile-back"
              onClick={backToList}
              aria-label="친구 목록으로"
            >
              ← 친구 목록
            </button>
          )}
        {selectedStudentId ? (
          <PortfolioStudentView
            key={selectedStudentId}
            studentId={selectedStudentId}
            selfStudentId={selfStudentId}
            busyCardId={busy}
            onToggleShowcase={onCardToggle}
            registerCardPatcher={(p) => {
              cardPatcherRef.current = p;
            }}
          />
        ) : (
          <div className="portfolio-empty">
            <p>좌측에서 학생을 선택하세요.</p>
          </div>
        )}
      </main>

        {limitModal && (
          <ShowcaseLimitModal
            showcased={limitModal.showcased}
            onCancel={dismissLimit}
            onConfirm={(removeId) => void replaceWith(removeId)}
          />
        )}
      </div>
    </>
  );
}
