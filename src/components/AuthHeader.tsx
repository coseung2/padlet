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
 * Login link for unauthenticated users.
 */
export function LoginLink() {
  return (
    <Link href="/login" className="auth-login-link">
      로그인
    </Link>
  );
}
