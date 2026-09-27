import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOrganizationReplyTo } from "./reply-to";

describe("parseOrganizationReplyTo", () => {
  it("accepts a simple contact email", () => {
    assert.equal(parseOrganizationReplyTo("ops@example.com"), "ops@example.com");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(parseOrganizationReplyTo("  ops@example.com  "), "ops@example.com");
  });

  it("rejects multiple addresses", () => {
    assert.equal(parseOrganizationReplyTo("a@example.com, b@example.com"), undefined);
  });

  it("rejects angle brackets and display-name forms", () => {
    assert.equal(parseOrganizationReplyTo("Ops <ops@example.com>"), undefined);
  });

  it("rejects embedded whitespace and line breaks", () => {
    assert.equal(parseOrganizationReplyTo("ops@example.com\n"), undefined);
    assert.equal(parseOrganizationReplyTo("ops @example.com"), undefined);
  });

  it("rejects empty and null", () => {
    assert.equal(parseOrganizationReplyTo(""), undefined);
    assert.equal(parseOrganizationReplyTo("   "), undefined);
    assert.equal(parseOrganizationReplyTo(null), undefined);
    assert.equal(parseOrganizationReplyTo(undefined), undefined);
  });
});
