"use client";

import { useState, useRef } from "react";
import { useLinkPreview } from "./useLinkPreview";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { fileMimeToIcon, fileMimeToLabel, formatBytes } from "@/lib/file-attachment";

export type AddCardData = {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDesc?: string;
  linkImage?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
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

export function AddCardModal({ onAdd, onClose, sections, defaultSectionId }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileMimeType, setFileMimeType] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState(defaultSectionId ?? sections?.[0]?.id ?? "");
  const [showImage, setShowImage] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const { preview, loading: previewLoading, fetchPreview, reset: resetPreview } = useLinkPreview();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [pickedAssetId, setPickedAssetId] = useState<string | null>(null);

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
    const picked = libraryAssets.find((a) => a.id === pickedAssetId);
    if (picked) {
      const url = picked.thumbnailUrl ?? picked.fileUrl;
      setImageUrl(url);
      setShowImage(true);
    }
    setPickerOpen(false);
  }

  async function handleFileUpload(file: File, type: "image" | "video" | "file") {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (type === "image") setImageUrl(data.url);
        else if (type === "video") setVideoUrl(data.url);
        else {
          setFileUrl(data.url);
          setFileName(data.name ?? file.name);
          setFileSize(typeof data.size === "number" ? data.size : file.size);
          setFileMimeType(data.mimeType ?? file.type);
        }
      } else {
        alert(`업로드 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
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
            setBusy(true);
            await onAdd({
              title: title.trim(),
              content: content.trim(),
              imageUrl: imageUrl || undefined,
              linkUrl: linkUrl || undefined,
              linkTitle: preview?.title || undefined,
              linkDesc: preview?.description || undefined,
              linkImage: preview?.image || undefined,
              videoUrl: videoUrl || undefined,
              fileUrl: fileUrl || undefined,
              fileName: fileName || undefined,
              fileSize: fileSize > 0 ? fileSize : undefined,
              fileMimeType: fileMimeType || undefined,
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
              🖼️ 이미지
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
              🎬 동영상
            </button>
            <button
              type="button"
              className={`modal-attach-btn ${showFile ? "modal-attach-btn-active" : ""}`}
              onClick={() => setShowFile(!showFile)}
              aria-label="파일 첨부"
            >
              📎 파일
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

          {/* ── 이미지 (개별 토글) ── */}
          {showImage && (
            <div className="modal-attach-section">
              {imageUrl ? (
                <div className="modal-file-preview optimized-img-wrap">
                  <OptimizedImage
                    src={imageUrl}
                    alt=""
                    className="modal-preview-img"
                    sizes="320px"
                    fit="contain"
                  />
                  <button type="button" className="modal-file-remove" onClick={() => setImageUrl("")}>제거</button>
                </div>
              ) : (
                <div
                  className="modal-file-drop"
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("drag-over");
                    const f = e.dataTransfer.files[0];
                    if (f && f.type.startsWith("image/")) handleFileUpload(f, "image");
                  }}
                >
                  <span className="modal-file-drop-icon">🖼️</span>
                  <span>{uploading ? "업로드 중..." : "클릭 또는 이미지를 드래그하세요"}</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "image");
                    }}
                  />
                </div>
              )}
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

          {/* ── 파일 (개별 토글) ── */}
          {showFile && (
            <div className="modal-attach-section">
              {fileUrl ? (
                <div className="modal-file-preview modal-file-preview-file">
                  <span className="modal-file-preview-icon" aria-hidden>
                    {fileMimeToIcon(fileMimeType)}
                  </span>
                  <div className="modal-file-preview-body">
                    <span className="modal-file-preview-name" title={fileName}>
                      {fileName}
                    </span>
                    <span className="modal-file-preview-meta">
                      {formatBytes(fileSize)} · {fileMimeToLabel(fileMimeType)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-file-remove"
                    onClick={() => {
                      setFileUrl("");
                      setFileName("");
                      setFileSize(0);
                      setFileMimeType("");
                    }}
                  >
                    제거
                  </button>
                </div>
              ) : (
                <div
                  className="modal-file-drop"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("drag-over");
                    const f = e.dataTransfer.files[0];
                    if (f) handleFileUpload(f, "file");
                  }}
                >
                  <span className="modal-file-drop-icon">📎</span>
                  <span>{uploading ? "업로드 중..." : "클릭 또는 파일을 드래그하세요"}</span>
                  <span className="modal-file-drop-hint">
                    PDF · Word · Excel · PowerPoint · HWP · TXT · ZIP (최대 50MB)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx,text/plain,application/zip,application/x-zip-compressed,.pdf,.docx,.xlsx,.pptx,.hwp,.hwpx,.txt,.zip"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "file");
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── 동영상 (개별 토글) ── */}
          {showVideo && (
            <div className="modal-attach-section">
              {videoUrl ? (
                <div className="modal-file-preview">
                  <video src={videoUrl} className="modal-preview-video-file" controls />
                  <button type="button" className="modal-file-remove" onClick={() => setVideoUrl("")}>제거</button>
                </div>
              ) : (
                <div
                  className="modal-file-drop"
                  onClick={() => videoInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("drag-over");
                    const f = e.dataTransfer.files[0];
                    if (f && f.type.startsWith("video/")) handleFileUpload(f, "video");
                  }}
                >
                  <span className="modal-file-drop-icon">🎬</span>
                  <span>{uploading ? "업로드 중..." : "클릭 또는 동영상을 드래그하세요"}</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "video");
                    }}
                  />
                </div>
              )}
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
                disabled={!pickedAssetId}
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
