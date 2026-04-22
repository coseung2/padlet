"use client";

// 코딩 교실 설정 패널 (Seed 13 Phase 3 follow-up, 2026-04-22).
// 교사만 접근. 쿼터·모더레이션 정책·리뷰 공개 범위 조정.
// GET + PATCH  /api/vibe/config?boardId=xxx

import { useEffect, useState } from "react";

type Config = {
  boardId: string;
  enabled: boolean;
  moderationPolicy: "teacher_approval_required" | "auto_publish" | "hybrid_trusted";
  perStudentDailyTokenCap: number | null;
  classroomDailyTokenPool: number;
  crossClassroomVisible: boolean;
  reviewAuthorDisplay: "named" | "anonymous" | "hidden_to_peer";
  reviewRatingSystem: "stars_1_5" | "thumbs" | "emoji_5";
  allowRemix: boolean;
};

type Props = {
  boardId: string;
  onClose: () => void;
  onSaved?: (cfg: Config) => void;
};

export function VibeSettingsPanel({ boardId, onClose, onSaved }: Props) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/vibe/config?boardId=${encodeURIComponent(boardId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Config;
        if (!cancelled) setCfg(data);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/vibe/config?boardId=${encodeURIComponent(boardId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: cfg.enabled,
          moderationPolicy: cfg.moderationPolicy,
          perStudentDailyTokenCap: cfg.perStudentDailyTokenCap,
          classroomDailyTokenPool: cfg.classroomDailyTokenPool,
          crossClassroomVisible: cfg.crossClassroomVisible,
          reviewAuthorDisplay: cfg.reviewAuthorDisplay,
          reviewRatingSystem: cfg.reviewRatingSystem,
          allowRemix: cfg.allowRemix,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Config;
      setCfg(data);
      setMsg("저장 완료");
      onSaved?.(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="va-settings-modal">
        <div className="va-mod-modal-header">
          <h2 className="va-mod-modal-title">⚙ 코딩 교실 설정</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="va-settings-body">
          {loading ? (
            <div className="va-mod-loading">불러오는 중…</div>
          ) : err && !cfg ? (
            <div className="va-mod-error" role="alert">
              불러오기 실패: {err}
            </div>
          ) : cfg ? (
            <>
              <section className="va-settings-section">
                <label className="va-settings-row">
                  <span className="va-settings-label">코딩 교실 열기</span>
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                    disabled={saving}
                  />
                </label>
                <p className="va-settings-hint">
                  끄면 학생들은 잠긴 안내 화면만 보게 됩니다.
                </p>
              </section>

              <section className="va-settings-section">
                <h3 className="va-settings-heading">쿼터</h3>
                <label className="va-settings-row">
                  <span className="va-settings-label">학급 일일 토큰 풀</span>
                  <input
                    type="number"
                    min={0}
                    max={100_000_000}
                    step={50_000}
                    value={cfg.classroomDailyTokenPool}
                    onChange={(e) =>
                      update("classroomDailyTokenPool", Number(e.target.value) || 0)
                    }
                    disabled={saving}
                    className="va-settings-input"
                  />
                </label>
                <label className="va-settings-row">
                  <span className="va-settings-label">학생 1인 일일 상한</span>
                  <input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={5_000}
                    value={cfg.perStudentDailyTokenCap ?? 0}
                    onChange={(e) =>
                      update(
                        "perStudentDailyTokenCap",
                        Number(e.target.value) === 0 ? null : Number(e.target.value),
                      )
                    }
                    disabled={saving}
                    className="va-settings-input"
                  />
                </label>
                <p className="va-settings-hint">
                  학생 상한 0 = 제한 없음 (학급 풀만 적용). 기본값은 학급 150만, 학생 4.5만.
                </p>
              </section>

              <section className="va-settings-section">
                <h3 className="va-settings-heading">모더레이션 정책</h3>
                <label className="va-settings-row va-settings-row-col">
                  <select
                    value={cfg.moderationPolicy}
                    onChange={(e) =>
                      update(
                        "moderationPolicy",
                        e.target.value as Config["moderationPolicy"],
                      )
                    }
                    disabled={saving}
                    className="va-settings-select"
                  >
                    <option value="teacher_approval_required">
                      교사 승인 필수 (권장)
                    </option>
                    <option value="auto_publish">
                      자동 공개 (모더레이션 생략)
                    </option>
                    <option value="hybrid_trusted" disabled>
                      신뢰 학생만 자동 공개 (준비중)
                    </option>
                  </select>
                </label>
              </section>

              <section className="va-settings-section">
                <h3 className="va-settings-heading">리뷰 표시</h3>
                <label className="va-settings-row va-settings-row-col">
                  <span className="va-settings-label">작성자 이름 공개 방식</span>
                  <select
                    value={cfg.reviewAuthorDisplay}
                    onChange={(e) =>
                      update(
                        "reviewAuthorDisplay",
                        e.target.value as Config["reviewAuthorDisplay"],
                      )
                    }
                    disabled={saving}
                    className="va-settings-select"
                  >
                    <option value="named">실명 공개</option>
                    <option value="anonymous">익명</option>
                    <option value="hidden_to_peer">학생끼리 숨김(교사만 봄)</option>
                  </select>
                </label>
                <label className="va-settings-row va-settings-row-col">
                  <span className="va-settings-label">평점 방식</span>
                  <select
                    value={cfg.reviewRatingSystem}
                    onChange={(e) =>
                      update(
                        "reviewRatingSystem",
                        e.target.value as Config["reviewRatingSystem"],
                      )
                    }
                    disabled={saving}
                    className="va-settings-select"
                  >
                    <option value="stars_1_5">별점 1-5</option>
                    <option value="thumbs">👍 / 👎</option>
                    <option value="emoji_5" disabled>
                      이모지 5 (준비중)
                    </option>
                  </select>
                </label>
              </section>

              {err && <p className="va-mod-error">{err}</p>}
              {msg && <p className="va-settings-ok">{msg}</p>}

              <div className="va-settings-footer">
                <button
                  type="button"
                  className="va-mod-btn is-ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="va-mod-btn is-approve"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
