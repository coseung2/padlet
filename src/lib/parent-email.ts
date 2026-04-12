import "server-only";

// PV-10 — parent email stub.
//
// Real provider integration (Resend / SES / Mailgun) is deferred; for now we
// log the payload so ops can verify the cron ran and see what *would* have
// been sent. When PARENT_EMAIL_ENABLED is set to "true", replace the inner
// call with a provider SDK.
//
// The stub intentionally returns successfully on every call so the cron
// doesn't retry on a missing provider; a real integration should return
// { ok: false } for retriable errors.

export interface DigestEmailInput {
  to: string;
  parentName: string;
  subject: string;
  children: Array<{
    studentName: string;
    plantObservations: number;
    drawingsCreated: number;
    breakoutJoined: number;
    eventSignups: number;
  }>;
  weekStart: Date;
  weekEnd: Date;
}

export async function sendParentDigest(input: DigestEmailInput): Promise<{ ok: boolean }> {
  const enabled = process.env.PARENT_EMAIL_ENABLED === "true";
  if (!enabled) {
    console.log("[parent-email:stub]", {
      to: input.to,
      subject: input.subject,
      parentName: input.parentName,
      childCount: input.children.length,
      weekStart: input.weekStart.toISOString(),
      weekEnd: input.weekEnd.toISOString(),
      summary: input.children.map((c) => ({
        name: c.studentName,
        plant: c.plantObservations,
        drawing: c.drawingsCreated,
        breakout: c.breakoutJoined,
        event: c.eventSignups,
      })),
    });
    return { ok: true };
  }

  // TODO(PV-10 follow-up): integrate Resend / SES. Example:
  //   await resend.emails.send({
  //     from: "no-reply@aura-board.app",
  //     to: input.to,
  //     subject: input.subject,
  //     html: renderDigestHtml(input),
  //   });
  console.warn("[parent-email] PARENT_EMAIL_ENABLED=true but no provider wired — no-op.");
  return { ok: true };
}
