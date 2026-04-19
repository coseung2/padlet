# v2 Mockup — Vertical list with pinned Now-Playing (selected)

레이아웃 구조 상세. phase7 구현 참조용.

## 전체 구조

```
<main class="dj-board">
  <header class="dj-board-header">
    <h1>🎧 {board.title}</h1>
    <div class="dj-board-meta">
      <span class="dj-count">{queueLength}곡</span>
      <span class="dj-djs">DJ: {djNames.join(" · ")}</span>
    </div>
  </header>

  {nowPlaying && (
    <section class="dj-nowplaying" role="status" aria-live="polite">
      <div class="dj-nowplaying-label">▶ NOW PLAYING</div>
      <div class="dj-nowplaying-body">
        <img class="dj-thumb dj-thumb-lg" src={thumb} width="240" height="135" />
        <div class="dj-nowplaying-info">
          <div class="dj-track-title">{title}</div>
          <div class="dj-track-meta">{channel} · {submitter}님 신청</div>
        </div>
        {canControl && (
          <button class="dj-next-btn" aria-label="다음 곡으로">⏭</button>
        )}
      </div>
    </section>
  )}

  <ul class="dj-queue-list">
    {approvedAndPending.map(card => (
      <li class="dj-queue-item" data-status={card.queueStatus}>
        {canControl && <span class="dj-drag-handle" aria-label="{title} 순서 변경">⋮⋮</span>}
        <img class="dj-thumb" src={card.linkImage} width="96" height="54" />
        <div class="dj-item-info">
          <div class="dj-track-title">{card.title}</div>
          <div class="dj-track-meta">
            {channel} · <span class="dj-submitter">{submitter}님</span>
          </div>
        </div>
        <span class={`dj-status-pill dj-status-${card.queueStatus}`}>
          {statusLabel[card.queueStatus]}
        </span>
        {canControl && <ContextMenu items={djActions} />}
        {!canControl && card.studentAuthorId === currentStudentId && card.queueStatus === "pending" && (
          <button class="dj-cancel-own">취소</button>
        )}
      </li>
    ))}
  </ul>

  <div class="dj-board-footer">
    <button class="dj-submit-btn primary">+ 곡 신청</button>
  </div>
</main>
```

## 치수/간격

| 요소 | 값 | 토큰 |
|---|---|---|
| 보드 최대 너비 | 780px | — |
| Now-Playing 썸네일 | 240×135 | — |
| Queue 썸네일 | 96×54 | — |
| 행 높이 | 72px | — |
| 행 간 구분선 | 1px solid var(--color-border) | ✓ |
| Now-Playing 배경 | `linear-gradient(...)` → 신규 토큰 `--color-dj-nowplaying-bg` | 신규 |
| 드래그 핸들 색 | `var(--color-text-faint)` | ✓ |
| status pill (pending) | bg `rgba(0,0,0,0.05)` text `var(--color-text-muted)` | alias |
| status pill (approved) | bg `var(--color-status-reviewed-bg)` text `var(--color-status-reviewed-text)` | ✓ |
| status pill (played) | bg transparent text `var(--color-text-faint)` | alias |
| status pill (rejected) | bg `var(--color-status-returned-bg)` text `var(--color-status-returned-text)` | ✓ (기본 숨김) |

## 상태별 화면

- **empty**: `<ul class="dj-queue-list is-empty">` + 중앙 SVG 🎧 아이콘 + 카피 + (DJ/교사) CTA.
- **loading**: `<li class="dj-queue-skeleton">` 3줄, shimmer 애니메이션.
- **ready — DJ/교사 뷰**: 위 전체 구조.
- **ready — 학생 뷰**: `.dj-drag-handle`과 ContextMenu 숨김. `.dj-cancel-own` 조건부 노출.
- **error (제출 실패)**: 모달 하단 `<p class="dj-modal-error">` 빨간 메시지.
- **success**: 모달 close + 리스트 slide-in.

## 반응형

- ≤ 640px: 보드 padding 축소 12→8px. Now-Playing 썸네일 180×101. ContextMenu는 bottom sheet 스타일.
- ≥ 1024px: 최대 너비 780px 중앙정렬.
