// Audit log helper (Seed 14 security, 2026-04-22).
// 권한 있는 행동을 DB AuditEvent 테이블에 저장. 실패해도 주 로직 차단 안 함.
//
// 사용 예:
//   await logAudit({
//     actorType: "teacher",
//     actorId: user.id,
//     action: "billing.refund",
//     resourceType: "subscription",
//     resourceId: user.id,
//     metadata: { orderId, canceledAmount, fullRefund: true },
//     req,
//   });

import "server-only";
import { db } from "./db";
import { extractIp, hashIp } from "./rate-limit";

export type AuditActorType = "teacher" | "student" | "system" | "admin";

export type AuditInput = {
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  /** Request 객체 — IP 추출 + 해싱. 생략 시 ip=null. */
  req?: Request;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    let ip: string | null = null;
    if (input.req) {
      ip = hashIp(extractIp(input.req));
    }
    await db.auditEvent.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata as never) ?? null,
        ip,
      },
    });
  } catch (err) {
    // 감사 로그 저장 실패가 메인 로직을 막지 못하도록 삼킴.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audit] logAudit failed:", (err as Error).message);
    }
  }
}
