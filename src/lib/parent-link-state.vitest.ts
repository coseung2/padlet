import { describe, expect, it } from "vitest";
import { canTransition, assertTransition, ALLOWED_TRANSITIONS } from "./parent-link-state";

describe("parent-link-state", () => {
  it("allows pending → active", () => {
    expect(canTransition("pending", "active")).toBe(true);
  });

  it("allows pending → rejected", () => {
    expect(canTransition("pending", "rejected")).toBe(true);
  });

  it("allows active → revoked", () => {
    expect(canTransition("active", "revoked")).toBe(true);
  });

  it("blocks pending → pending (no self transition)", () => {
    expect(canTransition("pending", "pending")).toBe(false);
  });

  it("blocks active → rejected (must revoke, not reject)", () => {
    expect(canTransition("active", "rejected")).toBe(false);
  });

  it("blocks rejected → active (dead-end)", () => {
    expect(canTransition("rejected", "active")).toBe(false);
  });

  it("blocks revoked → active (dead-end)", () => {
    expect(canTransition("revoked", "active")).toBe(false);
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("rejected", "active")).toThrow();
  });

  it("assertTransition passes on valid", () => {
    expect(() => assertTransition("pending", "active")).not.toThrow();
  });

  it("rejected + revoked are terminal states (no outgoing)", () => {
    expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
    expect(ALLOWED_TRANSITIONS.revoked).toEqual([]);
  });
});
