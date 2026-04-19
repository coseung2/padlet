"use client";

import { useState } from "react";

type Props = {
  error: string | null;
  onSubmit: (youtubeUrl: string) => void | Promise<void>;
  onClose: () => void;
};

export function DJSubmitForm({ error, onSubmit, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(url.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="dj-submit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="곡 신청"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="dj-submit-modal" onSubmit={handle}>
        <h2 className="dj-submit-title">🎧 곡 신청</h2>
        <label className="dj-submit-label" htmlFor="dj-submit-url">
          YouTube 링크
        </label>
        <input
          id="dj-submit-url"
          type="url"
          className="dj-submit-input"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          disabled={submitting}
        />
        {error && <p className="dj-submit-error">{error}</p>}
        <div className="dj-submit-actions">
          <button
            type="button"
            className="dj-submit-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="dj-submit-confirm"
            disabled={!url.trim() || submitting}
          >
            {submitting ? "신청 중…" : "신청"}
          </button>
        </div>
      </form>
    </div>
  );
}
