import { redirect } from "next/navigation";

// parent-class-invite-v2 Path A — the v1 invite-code+email form is replaced
// by the 2-step onboarding (email magic-link → class code → student pick).
// Preserve the /parent/join entry point (QR prefill etc.) by redirecting.

export default function ParentJoinRedirect({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  void searchParams; // v1 ?code= query param is no longer accepted by POST /api/parent/signup
  redirect("/parent/onboard/signup");
}
