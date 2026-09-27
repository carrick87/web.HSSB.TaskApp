import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRecipientEmailSuppressed } from "./suppression";

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

describe("isRecipientEmailSuppressed", () => {
  it("uses two separate exact eq queries (auth_email, then harrison_email)", async () => {
    const steps: string[] = [];
    const admin = buildLookupAdmin(async (column, value) => {
      steps.push(`${column}=${value}`);
      return { data: null, error: null };
    });

    const suppressed = await isRecipientEmailSuppressed(admin as never, "user@example.com");
    assert.equal(suppressed, false);
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
    const suppressed = await isRecipientEmailSuppressed(admin as never, "*@harrisons.com.my");
    assert.equal(suppressed, false);
    assert.equal(queries, 0);
  });

  it("treats lookup errors as suppressed (fail closed)", async () => {
    const admin = buildLookupAdmin(async (column) => {
      if (column === "auth_email") return { data: null, error: { message: "db down" } };
      return { data: null, error: null };
    });
    const suppressed = await isRecipientEmailSuppressed(admin as never, "user@example.com");
    assert.equal(suppressed, true);
  });
});
