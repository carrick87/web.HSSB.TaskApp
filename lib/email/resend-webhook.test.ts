import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractResendWebhookRecipientEmails,
  suppressProfilesForEmail,
} from "./resend-webhook";

describe("extractResendWebhookRecipientEmails", () => {
  it("reads email.bounced payload with Resend Permanent/Suppressed bounce", () => {
    const data = {
      created_at: "2024-04-01T10:00:00.000Z",
      email_id: "e7a7c4d2-1234-5678-9abc-def012345678",
      from: "notifications@carrick.my",
      to: ["member@example.com"],
      subject: "Fix loading bay door",
      bounce: {
        message: "The email address is on the suppression list",
        type: "Permanent",
        subType: "Suppressed",
      },
    };
    assert.deepEqual(extractResendWebhookRecipientEmails(data), ["member@example.com"]);
  });

  it("reads email.complained payload with multiple recipients", () => {
    const data = {
      created_at: "2024-04-01T11:00:00.000Z",
      email_id: "f8b8d5e3-2345-6789-abcd-ef0123456789",
      to: ["alice@example.com", "BOB@example.com"],
      complaint: { type: "abuse" },
    };
    assert.deepEqual(extractResendWebhookRecipientEmails(data), [
      "alice@example.com",
      "bob@example.com",
    ]);
  });

  it("falls back to data.email when data.to is missing", () => {
    assert.deepEqual(
      extractResendWebhookRecipientEmails({ email: "Legacy@resend.dev" }),
      ["legacy@resend.dev"]
    );
  });

  it("prefers data.to over data.email", () => {
    assert.deepEqual(
      extractResendWebhookRecipientEmails({
        to: ["primary@example.com"],
        email: "other@example.com",
      }),
      ["primary@example.com"]
    );
  });
});

describe("suppressProfilesForEmail", () => {
  it("updates auth_email and harrison_email with case-insensitive ilike", async () => {
    const calls: { column: string; value: string }[] = [];
    const admin = {
      from: () => ({
        update: () => ({
          ilike: async (column: string, value: string) => {
            calls.push({ column, value });
          },
        }),
      }),
    };

    await suppressProfilesForEmail(admin, ["a@example.com", "b@example.com"], "email.bounced");

    assert.equal(calls.length, 4);
    assert.deepEqual(calls.filter((c) => c.column === "auth_email").map((c) => c.value), [
      "a@example.com",
      "b@example.com",
    ]);
    assert.deepEqual(calls.filter((c) => c.column === "harrison_email").map((c) => c.value), [
      "a@example.com",
      "b@example.com",
    ]);
  });
});
