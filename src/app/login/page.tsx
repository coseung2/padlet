"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RoleIcon } from "@/components/login/RoleIcon";

type Role = {
  id: "teacher" | "student" | "parent";
  title: string;
  desc: string;
  cta: string;
  onSelect: () => void;
};

export default function LoginPage() {
  const router = useRouter();

  const roles: Role[] = [
    {
      id: "teacher",
      title: "교사",
      desc: "학급과 보드를 관리해요",
      cta: "Google로 로그인",
      onSelect: () => signIn("google", { redirectTo: "/" }),
    },
    {
      id: "student",
      title: "학생",
      desc: "QR/코드로 학급에 참여해요",
      cta: "학생 로그인",
      onSelect: () => router.push("/student/login"),
    },
    {
      id: "parent",
      title: "학부모",
      desc: "초대 코드로 자녀 작품을 봐요",
      cta: "초대 코드 입력",
      onSelect: () => router.push("/parent/join"),
    },
  ];

  return (
    <main className="login-page">
      <div className="login-hub-card">
        <div className="login-logo">A</div>
        <h1 className="login-title">Aura-board</h1>
        <p className="login-subtitle">어떤 역할로 들어가시나요?</p>

        <div className="login-hub-grid">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className="login-role-card"
              onClick={role.onSelect}
              aria-label={`${role.title}으로 계속`}
            >
              <div className="login-role-icon">
                <RoleIcon role={role.id} />
              </div>
              <div className="login-role-title">{role.title}</div>
              <div className="login-role-desc">{role.desc}</div>
              <div className="login-role-cta">{role.cta}</div>
            </button>
          ))}
        </div>

        <p className="login-mock-hint">
          개발 모드: URL에 <code>?as=owner</code>, <code>?as=editor</code>,{" "}
          <code>?as=viewer</code>를 추가하면 목 유저로 접속할 수 있습니다.
        </p>
      </div>
    </main>
  );
}
