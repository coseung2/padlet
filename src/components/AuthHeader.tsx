"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

/**
 * Shows user info + logout button when authenticated via Google OAuth.
 * When using mock auth (no real session), shows nothing — the UserSwitcher handles that.
 */
export function AuthHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="auth-header">
      {session.user.image && (
        <img
          src={session.user.image}
          alt=""
          className="auth-avatar"
          width={28}
          height={28}
        />
      )}
      <span className="auth-name">{session.user.name}</span>
      <SettingsMenu />
      <button
        className="auth-logout-btn"
        onClick={() => signOut({ redirectTo: "/login" })}
      >
        로그아웃
      </button>
    </div>
  );
}

/**
 * Native <details>-based dropdown so teachers can jump to infrequent-but-critical
 * settings (Canva app install guide) without hunting across routes.
 */
function SettingsMenu() {
  return (
    <details className="auth-settings">
      <summary
        className="auth-settings-trigger"
        title="설정 메뉴"
        aria-label="설정 메뉴 열기"
      >
        ⚙
      </summary>
      <div className="auth-settings-panel" role="menu">
        <Link
          href="/docs/canva-setup"
          className="auth-settings-item"
          role="menuitem"
        >
          🎨 Canva 앱 연결 안내
        </Link>
        <Link
          href="/docs/ai-setup"
          className="auth-settings-item"
          role="menuitem"
        >
          🤖 생성형 AI 연결하기
        </Link>
        <Link
          href="/billing"
          className="auth-settings-item"
          role="menuitem"
        >
          💳 결제·구독
        </Link>
      </div>
    </details>
  );
}

/**
 * Login link for unauthenticated users.
 */
export function LoginLink() {
  return (
    <Link href="/login" className="auth-login-link">
      로그인
    </Link>
  );
}
