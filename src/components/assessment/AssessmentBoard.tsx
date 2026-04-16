"use client";

// Entry shell for Board.layout === "assessment". Decides between
// composer / gradebook (teacher) and take / result (student) based on
// existing template + submission state. MVP-0 assumption: one template
// per board (first one wins); the multi-template UI is MVP-1.

import { useCallback, useEffect, useState } from "react";
import { AssessmentComposer } from "./AssessmentComposer";
import { AssessmentGradebook } from "./AssessmentGradebook";
import { AssessmentTake } from "./AssessmentTake";
import { AssessmentResult } from "./AssessmentResult";

type ViewerKind = "teacher" | "student" | "none";

type BootState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "no-template"; resolvedClassroomId: string | null }
  | { kind: "ready"; templateId: string; submissionId: string | null; submitted: boolean };

export interface AssessmentBoardProps {
  boardId: string;
  classroomId: string;
  viewerKind: ViewerKind;
}

export function AssessmentBoard({
  boardId,
  classroomId: propClassroomId,
  viewerKind,
}: AssessmentBoardProps) {
  const [state, setState] = useState<BootState>({ kind: "loading" });

  const boot = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/assessment/boards/${boardId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        templateId: string | null;
        classroomId?: string | null;
        submissionId: string | null;
        submitted: boolean;
      };
      if (!data.templateId) {
        setState({
          kind: "no-template",
          resolvedClassroomId: data.classroomId ?? propClassroomId ?? null,
        });
        return;
      }
      setState({
        kind: "ready",
        templateId: data.templateId,
        submissionId: data.submissionId,
        submitted: data.submitted,
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "bootstrap_failed",
      });
    }
  }, [boardId]);

  useEffect(() => {
    boot();
  }, [boot]);

  if (viewerKind === "none") {
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell">권한이 없습니다</div>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell">불러오는 중...</div>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell" role="alert">⚠ 불러오지 못했어요</div>
      </div>
    );
  }

  if (viewerKind === "teacher") {
    if (state.kind === "no-template") {
      const cid = state.resolvedClassroomId;
      if (!cid) {
        return (
          <div className="board-canvas-wrap">
            <div className="assessment-shell">
              <div className="assessment-empty">
                <div className="assessment-empty-icon">📝</div>
                <div>이 보드에 학급이 연결되지 않았습니다.</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  학급 연결된 보드에서 수행평가를 만들어 주세요.
                </div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="board-canvas-wrap">
          <div className="assessment-shell">
            <AssessmentComposer
              boardId={boardId}
              classroomId={cid}
              onCreated={() => boot()}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell">
          <AssessmentGradebook templateId={state.templateId} />
        </div>
      </div>
    );
  }

  // Student
  if (state.kind === "no-template") {
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell">
          <div className="assessment-empty">
            <div className="assessment-empty-icon">📋</div>
            <div>아직 수행평가가 준비되지 않았어요</div>
          </div>
        </div>
      </div>
    );
  }
  if (state.submissionId && state.submitted) {
    return (
      <div className="board-canvas-wrap">
        <div className="assessment-shell">
          <AssessmentResult submissionId={state.submissionId} />
        </div>
      </div>
    );
  }
  return (
    <div className="board-canvas-wrap">
      <div className="assessment-shell">
        <AssessmentTake
          templateId={state.templateId}
          onSubmitted={() => boot()}
        />
      </div>
    </div>
  );
}
