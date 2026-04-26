"use client";

type Child = {
  id: string;
  name: string;
  number: number | null;
  classroomName: string;
};

type Props = {
  children: Child[];
  selectedId: string;
  onSelect: (childId: string) => void;
};

export function ParentChildSelector({
  children,
  selectedId,
  onSelect,
}: Props) {
  if (children.length <= 1) return null;
  return (
    <label className="parent-child-selector">
      <span className="parent-child-selector-label">자녀</span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="자녀 선택"
      >
        {children.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.classroomName})
          </option>
        ))}
      </select>
    </label>
  );
}
