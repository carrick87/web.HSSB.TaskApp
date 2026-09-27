import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySuppressionLookupToOutbox } from "./outbox-suppression";

describe("applySuppressionLookupToOutbox", () => {
  it("returns unknown lookup to pending with incremented attempts (worker retry path)", async () => {
    const updates: Record<string, unknown>[] = [];
    const admin = {
      from: () => ({
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            updates.push({ id, ...patch });
          },
        }),
      }),
    };

    const maySend = await applySuppressionLookupToOutbox(
      admin as never,
      { id: "out-1", attempts: 1 },
      "unknown"
    );

    assert.equal(maySend, false);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "out-1");
    assert.equal(updates[0].status, "pending");
    assert.equal(updates[0].error, "suppression_lookup_failed");
    assert.equal(updates[0].attempts, 2);
    assert.ok(typeof updates[0].send_after === "string");
    assert.equal(updates[0].sent_at, undefined);
  });

  it("marks suppressed recipients without incrementing attempts", async () => {
    const updates: Record<string, unknown>[] = [];
    const admin = {
      from: () => ({
        update: (patch: Record<string, unknown>) => ({
          eq: async () => {
            updates.push(patch);
          },
        }),
      }),
    };

    const maySend = await applySuppressionLookupToOutbox(
      admin as never,
      { id: "out-2", attempts: 0 },
      "suppressed"
    );

    assert.equal(maySend, false);
    assert.deepEqual(updates, [{ status: "suppressed", error: "recipient_suppressed" }]);
  });
});
