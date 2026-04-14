import { Suspense } from "react";
import { StudentLoginForm } from "@/components/StudentLoginForm";

// StudentLoginForm uses useSearchParams() to read ?from=..., which
// forces the page out of static prerender. Mark it dynamic + wrap in
// Suspense per Next.js app-router requirements.
export const dynamic = "force-dynamic";

export default function StudentLoginPage() {
  return (
    <div className="student-login-page">
      <Suspense fallback={null}>
        <StudentLoginForm />
      </Suspense>
    </div>
  );
}
