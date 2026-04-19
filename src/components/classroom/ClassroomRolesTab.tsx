"use client";

import { useEffect, useState } from "react";
import { RolePermissionModal } from "./RolePermissionModal";

type Student = { id: string; name: string; number: number | null };

type RoleSummary = {
  key: string;
  labelKo: string;
  emoji: string | null;
  description: string;
  assignedStudents: Student[];
  permissions: Record<string, boolean>;
};

type CatalogEntry = {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultRoles: readonly string[];
};

type Props = { classroomId: string };

export function ClassroomRolesTab({ classroomId }: Props) {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/classrooms/${classroomId}/role-permissions`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { catalog: CatalogEntry[]; roles: RoleSummary[] };
    setCatalog(data.catalog);
    setRoles(data.roles);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const editingRoleData = roles.find((r) => r.key === editingRole) ?? null;

  return (
    <section className="classroom-roles">
      <header className="classroom-roles-header">
        <h2>학급 역할</h2>
        <p className="classroom-roles-desc">
          역할을 클릭해 권한을 세부 설정합니다. 체크 해제한 권한은 해당 역할 학생이
          해당 작업을 수행하지 못합니다.
        </p>
      </header>

      {!loaded ? (
        <p className="classroom-roles-loading">불러오는 중…</p>
      ) : (
        <ul className="classroom-role-grid">
          {roles.map((r) => {
            const isDj = r.key === "dj";
            const activeCount = Object.values(r.permissions).filter(Boolean).length;
            const totalCount = Object.keys(r.permissions).length;
            return (
              <li key={r.key} className="classroom-role-card">
                <button
                  type="button"
                  className="classroom-role-card-btn"
                  onClick={() => !isDj && setEditingRole(r.key)}
                  disabled={isDj}
                  aria-label={`${r.labelKo} 권한 편집`}
                >
                  <div className="classroom-role-emoji" aria-hidden="true">
                    {r.emoji ?? "•"}
                  </div>
                  <div className="classroom-role-label">{r.labelKo}</div>
                  <div className="classroom-role-meta">
                    {r.assignedStudents.length === 0 ? (
                      <span className="classroom-role-meta-faint">지정 학생 없음</span>
                    ) : (
                      <span>
                        {r.assignedStudents.slice(0, 3).map((s) => s.name).join(", ")}
                        {r.assignedStudents.length > 3 &&
                          ` 외 ${r.assignedStudents.length - 3}명`}
                      </span>
                    )}
                  </div>
                  <div className="classroom-role-perms">
                    {isDj ? (
                      <span className="classroom-role-badge">보드별 권한</span>
                    ) : (
                      <span>
                        활성 권한 {activeCount}/{totalCount}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editingRoleData && (
        <RolePermissionModal
          classroomId={classroomId}
          role={editingRoleData}
          catalog={catalog}
          onClose={() => setEditingRole(null)}
          onSaved={() => {
            setEditingRole(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}
