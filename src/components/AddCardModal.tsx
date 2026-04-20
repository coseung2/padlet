"use client";

import { useState, useRef } from "react";
import { useLinkPreview } from "./useLinkPreview";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import {
  fileMimeToIcon,
  fileMimeToLabel,
  formatBytes,
  MAX_ATTACHMENTS_PER_CARD,
} from "@/lib/file-attachment";

export type AttachmentDraft = {
  /** 클라이언트 전용 식별자(DB id 아님). React key용. */
  tempId: string;
  kind: "image" | "video" | "file";
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type AddCardData = {
  title: string;
  content: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDesc?: string;
  linkImage?: string;
  /** multi-attachment (2026-04-20): 여러 이미지/동영상/파일 리스트. */
  attachments?: AttachmentDraft[];
  color?: string;
  sectionId?: string;
  // When set, the caller should attach this StudentAsset to the created card
  // (POST /api/student-assets/{id}/attach) after the card row exists.
  attachAssetId?: string;
};

type LibraryAsset = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl: string | null;
};

type SectionOption = { id: string; title: string };

type Props = {
  onAdd: (data: AddCardData) => Promise<void>;
  onClose: () => void;
  sections?: SectionOption[];
  defaultSectionId?: string;
};

const COLOR_PRESETS = [
  null, "#ffd8f4", "#c3faf5", "#ffe6cd", "#fde0f0",
  "#f2f9ff", "#ffc6c6", "#f6f5f4", "#e8f5e9", "#fff3e0",
];

// 파일 input accept 문자열 — 모달 JSX에서 여러 번 쓰여서 상수로 분리.
const IMAGE_ACCEPT = "image/*";
const VIDEO_ACCEPT = "video/*";
const FILE_ACCEPT =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  "application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx," +
  "text/plain,application/zip,application/x-zip-compressed," +
  ".pdf,.docx,.xlsx,.pptx,.hwp,.hwpx,.txt,.zip";

function mintId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AddCardModal({ onAdd, onClose, sections, defaultSectionId }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState(defaultSectionId ?? sections?.[0]?.id ?? "");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [showImage, setShowImage] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const { preview, loading: previewLoading, fetchPreview } = useLinkPreview();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [pickedAssetId, setPickedAssetId] = useState<string | null>(null);

  const totalCount = attachments.length;
  const canAddMore = totalCount < MAX_ATTACHMENTS_PER_CARD;
  const countByKind = (kind: AttachmentDraft["kind"]) =>
    attachments.filter((a) => a.kind === kind).length;

  async function openLibrary() {
    setPickerOpen(true);
    if (libraryAssets === null) {
      setLibraryLoading(true);
      try {
        const res = await fetch("/api/student-assets?scope=mine");
        if (res.ok) {
          const data = (await res.json()) as { assets: LibraryAsset[] };
          setLibraryAssets(data.assets ?? []);
        } else {
          setLibraryAssets([]);
        }
      } catch {
        setLibraryAssets([]);
      } finally {
        setLibraryLoading(false);
      }
    }
  }

  function confirmLibraryPick() {
    if (!pickedAssetId || !libraryAssets) return;
    if (attachmentsRef.current.length >= MAX_ATTACHMENTS_PER_CARD) {
      alert(`첨부는 카드당 최대 ${MAX_ATTACHMENTS_PER_CARD}개까지 가능합니다.`);
      return;
    }
    const picked = libraryAssets.find((a) => a.id === pickedAssetId);
    if (picked) {
      const url = picked.thumbnailUrl ?? picked.fileUrl;
      // 라이브러리 픽은 "이미지" attachment로 추가. attachAssetId는 별도
      // StudentAsset 조인용으로 유지. attachmentsRef도 함께 갱신해서
      // 이후 업로드 상한 체크가 일관되도록 (codex H3 반영).
      setAttachments((prev) => {
        const next: AttachmentDraft[] = [
          ...prev,
          { tempId: mintId(), kind: "image", url },
        ];
        attachmentsRef.current = next;
        return next;
      });
      setShowImage(true);
    }
    setPickerOpen(false);
  }

  async function uploadOne(
    file: File,
    kind: AttachmentDraft["kind"]
  ): Promise<{ ok: true; draft: AttachmentDraft } | { ok: false; reason: string }> {
    const form = new FormData();
    form.append("file", file);
    let res: Response;
    try {
      res = await fetch("/api/upload", { method: "POST", body: form });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "network error";
      console.error(`[upload ${kind}] network`, e);
      return { ok: false, reason: `네트워크 오류 (${msg})` };
    }
    if (!res.ok) {
      // 서버가 JSON으로 { error } 또는 plain text로 반환. 둘 다 커버.
      let reason = `HTTP ${res.status}`;
      const text = await res.text().catch(() => "");
      try {
        const j = JSON.parse(text) as { error?: string };
        if (j.error) reason = j.error;
      } catch {
        if (text) reason = text;
      }
      console.error(`[upload ${kind}] ${file.name}: ${reason}`);
      return { ok: false, reason };
    }
    const data = await res.json();
    return {
      ok: true,
      draft: {
        tempId: mintId(),
        kind,
        url: data.url,
        fileName: data.name ?? file.name,
        fileSize: typeof data.size === "number" ? data.size : file.size,
        mimeType: data.mimeType ?? file.type,
      },
    };
  }

  // 여러 파일 순차 업로드 — 브라우저 메모리 & 서버 레이트 보수적으로.
  // 입력 파일은 이름순으로 정렬 후 업로드해 attachment 저장 순서도 이름순.
  async function uploadMany(files: File[], kind: AttachmentDraft["kind"]) {
    setUploading(true);
    const failures: string[] = [];
    // 사용자가 선택한 파일을 한글/숫자 혼합 파일명에 대해 자연스럽게 정렬
    // (예: "01차시"<"02차시"<"10차시"). localeCompare + numeric:true가 그 역할.
    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, "ko", { numeric: true, sensitivity: "base" })
    );
    for (const f of sorted) {
      if (attachmentsRef.current.length >= MAX_ATTACHMENTS_PER_CARD) {
        failures.push(`${f.name}: 첨부 최대 ${MAX_ATTACHMENTS_PER_CARD}개 초과`);
        continue;
      }
      const r = await uploadOne(f, kind);
      if (r.ok) {
        setAttachments((prev) => {
          const next = [...prev, r.draft];
          attachmentsRef.current = next;
          return next;
        });
      } else {
        failures.push(`${f.name}: ${r.reason}`);
      }
    }
    setUploading(false);
    if (failures.length > 0) {
      alert(
        `일부 업로드 실패 (${failures.length}/${files.length}):\n\n${failures.join("\n")}`
      );
    }
  }

  // setAttachments는 async 스냅샷이라 for-loop 내부에서 최신 길이 알기 어려움.
  // 상한 체크용 ref로 현재 리스트 동기 스냅샷 유지.
  const attachmentsRef = useRef<AttachmentDraft[]>(attachments);

  function removeAttachment(tempId: string) {
    setAttachments((prev) => {
      const next = prev.filter((a) => a.tempId !== tempId);
      attachmentsRef.current = next;
      return next;
    });
  }

  /** 같은 kind 내에서 위/아래로 이동. 카드에 저장되는 최종 order는 서버
   *  트랜잭션이 배열 인덱스로 매긴다(AddCardModal → payloadAttachments →
   *  /api/cards에서 idx를 order로 사용). */
  function moveAttachment(tempId: string, dir: -1 | 1) {
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.tempId === tempId);
      if (idx < 0) return prev;
      const kind = prev[idx].kind;
      // 같은 kind의 이웃을 찾아 교체. kind 간 순서는 건드리지 않음 —
      // 렌더도 kind별 섹션으로 분리되므로 kind 내 재배치만 의미 있음.
      const sameKindIndices = prev
        .map((a, i) => (a.kind === kind ? i : -1))
        .filter((i) => i >= 0);
      const pos = sameKindIndices.indexOf(idx);
      const swapPos = pos + dir;
      if (swapPos < 0 || swapPos >= sameKindIndices.length) return prev;
      const j = sameKindIndices[swapPos];
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      attachmentsRef.current = next;
      return next;
    });
  }

  function isFirstOfKind(tempId: string): boolean {
    const sameKind = attachments.filter((a) => {
      const target = attachments.find((x) => x.tempId === tempId);
      return target && a.kind === target.kind;
    });
    return sameKind[0]?.tempId === tempId;
  }

  function isLastOfKind(tempId: string): boolean {
    const sameKind = attachments.filter((a) => {
      const target = attachments.find((x) => x.tempId === tempId);
      return target && a.kind === target.kind;
    });
    return sameKind[sameKind.length - 1]?.tempId === tempId;
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal">
        <div className="modal-header">
          <h2 className="modal-title">새 카드 만들기</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form
          className="modal-body"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            // codex H3: 제출 전 authoritative 상한 검증.
            if (attachments.length > MAX_ATTACHMENTS_PER_CARD) {
              alert(`첨부는 카드당 최대 ${MAX_ATTACHMENTS_PER_CARD}개까지 가능합니다.`);
              return;
            }
            setBusy(true);
            // attachments는 서버에 전달할 때 tempId 제거한 순수 payload로 변환.
            const payloadAttachments = attachments.map((a) => ({
              kind: a.kind,
              url: a.url,
              fileName: a.fileName,
              fileSize: a.fileSize,
              mimeType: a.mimeType,
            })) as AttachmentDraft[];
            await onAdd({
              title: title.trim(),
              content: content.trim(),
              linkUrl: linkUrl || undefined,
              linkTitle: preview?.title || undefined,
              linkDesc: preview?.description || undefined,
              linkImage: preview?.image || undefined,
              attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
              color: color || undefined,
              sectionId: sectionId || undefined,
              attachAssetId: pickedAssetId ?? undefined,
            });
            setBusy(false);
            onClose();
          }}
        >
          {sections && sections.length > 0 && (
            <>
              <label className="modal-field-label">섹션</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="modal-select"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </>
          )}

          <label className="modal-field-label">제목</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="카드 제목"
            className="modal-input"
            maxLength={200}
            required
          />

          <label className="modal-field-label">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요..."
            rows={3}
            className="modal-textarea"
            maxLength={5000}
          />

          {/* ── 첨부 버튼 바 ── */}
          <div className="modal-attach-bar">
            <button
              type="button"
              className={`modal-attach-btn ${showImage ? "modal-attach-btn-active" : ""}`}
              onClick={() => setShowImage(!showImage)}
            >
              🖼️ 이미지{countByKind("image") > 0 && ` · ${countByKind("image")}`}
            </button>
            <button
              type="button"
              className={`modal-attach-btn ${showLink ? "modal-attach-btn-active" : ""}`}
              onClick={() => setShowLink(!showLink)}
            >
              🔗 링크
            </button>
            <button
              type="button"
              className={`modal-attach-btn ${showVideo ? "modal-attach-btn-active" : ""}`}
              onClick={() => setShowVideo(!showVideo)}
            >
              🎬 동영상{countByKind("video") > 0 && ` · ${countByKind("video")}`}
            </button>
            <button
              type="button"
              className={`modal-attach-btn ${showFile ? "modal-attach-btn-active" : ""}`}
              onClick={() => setShowFile(!showFile)}
              aria-label="파일 첨부"
            >
              📎 파일{countByKind("file") > 0 && ` · ${countByKind("file")}`}
            </button>
            <button
              type="button"
              className="modal-attach-btn"
              onClick={openLibrary}
              title="내 그림 라이브러리에서 선택"
            >
              🎨 내 라이브러리
            </button>
          </div>

          {totalCount >= MAX_ATTACHMENTS_PER_CARD && (
            <p className="modal-attach-notice">
              첨부는 카드당 최대 {MAX_ATTACHMENTS_PER_CARD}개까지예요.
            </p>
          )}

          {/* ── 이미지 섹션 ── */}
          {showImage && (
            <div className="modal-attach-section">
              <div className="modal-attach-list">
                {attachments
                  .filter((a) => a.kind === "image")
                  .map((a) => (
                    <div key={a.tempId} className="modal-attach-list-item modal-attach-list-item-image">
                      <div className="optimized-img-wrap">
                        <OptimizedImage
                          src={a.url}
                          alt={a.fileName ?? ""}
                          sizes="100px"
                          fit="cover"
                        />
                      </div>
                      <div className="modal-attach-reorder modal-attach-reorder-overlay">
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, -1)}
                          disabled={isFirstOfKind(a.tempId)}
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, 1)}
                          disabled={isLastOfKind(a.tempId)}
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="modal-attach-item-remove"
                        onClick={() => removeAttachment(a.tempId)}
                        aria-label="제거"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
              <div
                className={`modal-file-drop ${!canAddMore ? "is-disabled" : ""}`}
                onClick={() => canAddMore && imageInputRef.current?.click()}
                onDragOver={(e) => { if (!canAddMore) return; e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("drag-over");
                  if (!canAddMore) return;
                  const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                  if (fs.length > 0) void uploadMany(fs, "image");
                }}
              >
                <span className="modal-file-drop-icon">🖼️</span>
                <span>{uploading ? "업로드 중..." : "클릭 또는 이미지를 드래그 (여러 개 선택 가능)"}</span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length > 0) void uploadMany(fs, "image");
                    // 같은 파일 재선택 가능하게 리셋
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          {/* ── 링크 (개별 토글) ── */}
          {showLink && (
            <div className="modal-attach-section">
              <input
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  fetchPreview(e.target.value);
                }}
                placeholder="https://..."
                className="modal-input"
                type="url"
              />
              {previewLoading && <div className="link-preview-loading">미리보기 가져오는 중...</div>}
              {preview && (preview.title || preview.image) && (
                <div className="link-preview-card">
                  {preview.image && (
                    <div className="link-preview-card-image optimized-img-wrap">
                      <OptimizedImage src={preview.image} alt="" sizes="160px" />
                    </div>
                  )}
                  <div className="link-preview-card-body">
                    {preview.title && <div className="link-preview-card-title">{preview.title}</div>}
                    {preview.description && <div className="link-preview-card-desc">{preview.description}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 동영상 섹션 ── */}
          {showVideo && (
            <div className="modal-attach-section">
              <div className="modal-attach-list">
                {attachments
                  .filter((a) => a.kind === "video")
                  .map((a) => (
                    <div key={a.tempId} className="modal-attach-list-item modal-attach-list-item-video">
                      <video src={a.url} className="modal-preview-video-file" preload="metadata" />
                      <div className="modal-attach-reorder modal-attach-reorder-overlay">
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, -1)}
                          disabled={isFirstOfKind(a.tempId)}
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, 1)}
                          disabled={isLastOfKind(a.tempId)}
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="modal-attach-item-remove"
                        onClick={() => removeAttachment(a.tempId)}
                        aria-label="제거"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
              <div
                className={`modal-file-drop ${!canAddMore ? "is-disabled" : ""}`}
                onClick={() => canAddMore && videoInputRef.current?.click()}
                onDragOver={(e) => { if (!canAddMore) return; e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("drag-over");
                  if (!canAddMore) return;
                  const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("video/"));
                  if (fs.length > 0) void uploadMany(fs, "video");
                }}
              >
                <span className="modal-file-drop-icon">🎬</span>
                <span>{uploading ? "업로드 중..." : "클릭 또는 동영상을 드래그"}</span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length > 0) void uploadMany(fs, "video");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          {/* ── 파일 섹션 ── */}
          {showFile && (
            <div className="modal-attach-section">
              <div className="modal-attach-list">
                {attachments
                  .filter((a) => a.kind === "file")
                  .map((a) => (
                    <div key={a.tempId} className="modal-file-preview modal-file-preview-file">
                      <span className="modal-file-preview-icon" aria-hidden>
                        {fileMimeToIcon(a.mimeType ?? "")}
                      </span>
                      <div className="modal-file-preview-body">
                        <span className="modal-file-preview-name" title={a.fileName ?? ""}>
                          {a.fileName ?? "파일"}
                        </span>
                        <span className="modal-file-preview-meta">
                          {a.fileSize ? formatBytes(a.fileSize) : "—"} ·{" "}
                          {fileMimeToLabel(a.mimeType ?? "")}
                        </span>
                      </div>
                      <div className="modal-attach-reorder">
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, -1)}
                          disabled={isFirstOfKind(a.tempId)}
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="modal-attach-reorder-btn"
                          onClick={() => moveAttachment(a.tempId, 1)}
                          disabled={isLastOfKind(a.tempId)}
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="modal-file-remove"
                        onClick={() => removeAttachment(a.tempId)}
                      >
                        제거
                      </button>
                    </div>
                  ))}
              </div>
              <div
                className={`modal-file-drop ${!canAddMore ? "is-disabled" : ""}`}
                onClick={() => canAddMore && fileInputRef.current?.click()}
                onDragOver={(e) => { if (!canAddMore) return; e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("drag-over");
                  if (!canAddMore) return;
                  const fs = Array.from(e.dataTransfer.files);
                  if (fs.length > 0) void uploadMany(fs, "file");
                }}
              >
                <span className="modal-file-drop-icon">📎</span>
                <span>{uploading ? "업로드 중..." : "클릭 또는 파일을 드래그 (여러 개 선택 가능)"}</span>
                <span className="modal-file-drop-hint">
                  PDF · Word · Excel · PowerPoint · HWP · TXT · ZIP (파일당 최대 50MB)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length > 0) void uploadMany(fs, "file");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          )}

          <div className="modal-color-section">
            <span className="modal-color-label">카드 색상</span>
            <div className="modal-color-row">
              {COLOR_PRESETS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`modal-color-btn ${color === c ? "modal-color-btn-active" : ""}`}
                  style={{ background: c ?? "#ffffff" }}
                  onClick={() => setColor(c)}
                  aria-label={c ?? "기본"}
                >
                  {color === c && "✓"}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={busy || uploading} className="modal-btn-cancel">
              취소
            </button>
            <button type="submit" disabled={busy || uploading || !title.trim()} className="modal-btn-submit">
              {busy ? "추가 중..." : "카드 추가"}
            </button>
          </div>
        </form>
      </div>

      {pickerOpen && (
        <div className="library-picker-overlay" onClick={() => setPickerOpen(false)}>
          <div className="library-picker" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">내 라이브러리</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPickerOpen(false)}
              >
                ×
              </button>
            </div>
            {libraryLoading && <p className="muted">불러오는 중...</p>}
            {!libraryLoading && libraryAssets && libraryAssets.length === 0 && (
              <p className="muted">
                아직 업로드한 그림이 없어요. 그림보드(🎨) 레이아웃에서 먼저 업로드하세요.
              </p>
            )}
            {!libraryLoading && libraryAssets && libraryAssets.length > 0 && (
              <div className="library-picker-grid">
                {libraryAssets.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className={`library-picker-item ${
                      pickedAssetId === a.id ? "selected" : ""
                    }`}
                    onClick={() => setPickedAssetId(a.id)}
                    aria-pressed={pickedAssetId === a.id}
                  >
                    {a.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbnailUrl} alt={a.title || "그림"} />
                    ) : (
                      <span aria-hidden>🖼️</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setPickerOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="modal-btn-submit"
                disabled={!pickedAssetId || !canAddMore}
                onClick={confirmLibraryPick}
              >
                첨부
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
