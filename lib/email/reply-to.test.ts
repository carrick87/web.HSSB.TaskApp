import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOrganizationReplyTo } from "./reply-to";

describe("parseOrganizationReplyTo", () => {
  it("accepts admin@harrisons.com.my", () => {
    assert.equal(parseOrganizationReplyTo("admin@harrisons.com.my"), "admin@harrisons.com.my");
  });

  it("accepts first.last+tag@example.co", () => {
    assert.equal(parseOrganizationReplyTo("first.last+tag@example.co"), "first.last+tag@example.co");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(parseOrganizationReplyTo("  ops@example.com  "), "ops@example.com");
  });

  it("rejects multiple addresses and display-name forms", () => {
    assert.equal(parseOrganizationReplyTo("a@example.com, b@example.com"), undefined);
    assert.equal(parseOrganizationReplyTo("Ops <ops@example.com>"), undefined);
  });

  it("rejects embedded whitespace and line breaks", () => {
    assert.equal(parseOrganizationReplyTo("ops@example.com\n"), undefined);
    assert.equal(parseOrganizationReplyTo("ops @example.com"), undefined);
  });

  it("rejects invalid mailbox shapes", () => {
    assert.equal(parseOrganizationReplyTo("a@b@c.com"), undefined);
    assert.equal(parseOrganizationReplyTo('a"b@x.com'), undefined);
    assert.equal(parseOrganizationReplyTo("a;b@x.com"), undefined);
    assert.equal(parseOrganizationReplyTo("(x)@y.com"), undefined);
    assert.equal(parseOrganizationReplyTo("a@b..com"), undefined);
    assert.equal(parseOrganizationReplyTo("a@-b.com"), undefined);
    assert.equal(parseOrganizationReplyTo("x@y.c"), undefined);
    assert.equal(parseOrganizationReplyTo("*@harrisons.com.my"), undefined);
  });

  it("rejects empty and null", () => {
    assert.equal(parseOrganizationReplyTo(""), undefined);
    assert.equal(parseOrganizationReplyTo("   "), undefined);
    assert.equal(parseOrganizationReplyTo(null), undefined);
    assert.equal(parseOrganizationReplyTo(undefined), undefined);
  });
});
