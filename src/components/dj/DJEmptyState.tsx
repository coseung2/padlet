type Props = {
  canControl: boolean;
  onAdd: () => void;
};

export function DJEmptyState({ canControl, onAdd }: Props) {
  return (
    <div className="dj-empty-state">
      <div className="dj-empty-icon" aria-hidden="true">
        🎧
      </div>
      <p className="dj-empty-text">아직 신청 곡이 없어요</p>
      <button type="button" className="dj-empty-cta" onClick={onAdd}>
        {canControl ? "첫 곡을 추가해보세요" : "곡 신청"}
      </button>
    </div>
  );
}
