import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupRecipientSuppression } from "./suppression";

function buildLookupAdmin(onMaybeSingle: (column: string, value: string) => Promise<{ data: unknown; error: unknown }>) {
  return {
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          if (column !== "email_suppressed") throw new Error(`unexpected column ${column}`);
          return {
            eq: (col2: string, val2: string) => ({
              limit: () => ({
                maybeSingle: () => onMaybeSingle(col2, val2),
              }),
            }),
          };
        },
      }),
    }),
  };
}

describe("lookupRecipientSuppression", () => {
  it("uses two separate exact eq queries (auth_email, then harrison_email)", async () => {
    const steps: string[] = [];
    const admin = buildLookupAdmin(async (column, value) => {
      steps.push(`${column}=${value}`);
      return { data: null, error: null };
    });

    const status = await lookupRecipientSuppression(admin as never, "user@example.com");
    assert.equal(status, "not_suppressed");
    assert.deepEqual(steps, ["auth_email=user@example.com", "harrison_email=user@example.com"]);
  });

  it("does not query for invalid wildcard-looking addresses", async () => {
    let queries = 0;
    const admin = {
      from: () => {
        queries++;
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({}) }) }) }) }) };
      },
    };
    const status = await lookupRecipientSuppression(admin as never, "*@harrisons.com.my");
    assert.equal(status, "not_suppressed");
    assert.equal(queries, 0);
  });

  it("returns unknown on lookup errors so the worker can retry", async () => {
    const admin = buildLookupAdmin(async (column) => {
      if (column === "auth_email") return { data: null, error: { message: "db down" } };
      return { data: null, error: null };
    });
    const status = await lookupRecipientSuppression(admin as never, "user@example.com");
    assert.equal(status, "unknown");
  });
});
