"use client";

import { useState, useRef } from "react";
import { uploadFile } from "@/lib/upload-client";

export type SubmissionData = {
  id: string;
  boardId: string;
  // userId is nullable for event-signup public submissions (ES-1).
  // Assignment flows still carry userId; this component filters by it so
  // null-owner rows are simply skipped.
  userId: string | null;
  content: string;
  linkUrl: string | null;
  fileUrl: string | null;
  status: string;
  feedback: string | null;
  grade: string | null;
  createdAt: string;
};

/* ── Submit Modal ── */
export function SubmitModal({
  existing,
  onSubmit,
  onClose,
}: {
  existing: SubmissionData | null;
  onSubmit: (content: string, linkUrl: string, fileUrl: string) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState(existing?.content ?? "");
  const [linkUrl, setLinkUrl] = useState(existing?.linkUrl ?? "");
  const [fileUrl, setFileUrl] = useState(existing?.fileUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setFileUrl(url);
    } catch {}
    setUploading(false);
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal">
        <div className="modal-header">
          <h2 className="modal-title">과제 제출</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="modal-field-label">내용</label>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="과제 내용을 작성하세요..."
            rows={5}
            className="modal-textarea"
          />
          <label className="modal-field-label">링크 (선택)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="modal-input"
            type="url"
          />
          <label className="modal-field-label">파일 첨부 (선택)</label>
          {fileUrl ? (
            <div className="modal-file-preview">
              <span>{fileUrl}</span>
              <button type="button" className="modal-file-remove" onClick={() => setFileUrl("")}>제거</button>
            </div>
          ) : (
            <div className="modal-file-drop" onClick={() => fileRef.current?.click()}>
              <span className="modal-file-drop-icon">📎</span>
              <span>{uploading ? "업로드 중..." : "클릭하여 파일 첨부"}</span>
              <input ref={fileRef} type="file" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }} />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-btn-cancel">취소</button>
            <button
              type="button"
              onClick={() => onSubmit(content, linkUrl, fileUrl)}
              disabled={!content.trim() && !linkUrl && !fileUrl}
              className="modal-btn-submit"
            >
              제출
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── View Submission Modal (teacher) ── */
export function ViewModal({
  submission,
  studentName,
  onReview,
  onClose,
}: {
  submission: SubmissionData;
  studentName: string;
  onReview: (id: string, status: string, feedback?: string, grade?: string) => void;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [grade, setGrade] = useState(submission.grade ?? "");

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal">
        <div className="modal-header">
          <h2 className="modal-title">{studentName}의 제출물</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="modal-field-label">제출 내용</label>
          <div className="assign-view-content">{submission.content || "(내용 없음)"}</div>

          {submission.linkUrl && (
            <>
              <label className="modal-field-label">첨부 링크</label>
              <a href={submission.linkUrl} target="_blank" rel="noopener noreferrer" className="assign-link">
                🔗 {submission.linkUrl}
              </a>
            </>
          )}

          {submission.fileUrl && (
            <>
              <label className="modal-field-label">첨부 파일</label>
              <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" className="assign-link">
                📎 {submission.fileUrl}
              </a>
            </>
          )}

          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "16px 0" }} />

          <label className="modal-field-label">피드백</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="학생에게 전달할 피드백..."
            rows={3}
            className="modal-textarea"
          />

          <label className="modal-field-label">평가</label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="예: A+, 90점, 우수"
            className="modal-input"
          />

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => onReview(submission.id, "returned", feedback, grade)}
              className="modal-btn-cancel"
              style={{ color: "#dc3545" }}
            >
              반려
            </button>
            <button
              type="button"
              onClick={() => onReview(submission.id, "reviewed", feedback, grade)}
              className="modal-btn-submit"
            >
              확인 완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
