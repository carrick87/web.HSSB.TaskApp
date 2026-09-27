import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidEmailAddress, normalizeEmailAddress } from "./address";

describe("normalizeEmailAddress", () => {
  it("accepts admin@harrisons.com.my", () => {
    assert.equal(normalizeEmailAddress("admin@harrisons.com.my"), "admin@harrisons.com.my");
  });

  it("accepts first.last+tag@example.co", () => {
    assert.equal(normalizeEmailAddress("first.last+tag@example.co"), "first.last+tag@example.co");
  });

  it("rejects wildcard local part", () => {
    assert.equal(normalizeEmailAddress("*@harrisons.com.my"), null);
  });

  it("rejects multiple @", () => {
    assert.equal(normalizeEmailAddress("a@b@c.com"), null);
  });

  it("rejects quote semicolon and parens in local part", () => {
    assert.equal(normalizeEmailAddress('a"b@x.com'), null);
    assert.equal(normalizeEmailAddress("a;b@x.com"), null);
    assert.equal(normalizeEmailAddress("(x)@y.com"), null);
  });

  it("rejects invalid domain labels and TLD", () => {
    assert.equal(normalizeEmailAddress("a@b..com"), null);
    assert.equal(normalizeEmailAddress("a@-b.com"), null);
    assert.equal(normalizeEmailAddress("x@y.c"), null);
  });
});

describe("isValidEmailAddress", () => {
  it("rejects comma and angle-bracket injection shapes", () => {
    assert.equal(isValidEmailAddress("a,id.not.is.null@x.com"), false);
  });
});
