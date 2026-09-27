import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkspaceFromHeader,
  emailProductDisplayName,
  sanitizeOrgNameForHeader,
} from "./format";

const EMAIL_FROM = "HAR TaskApp <notifications@carrick.my>";

describe("emailProductDisplayName", () => {
  it("uses display name from EMAIL_FROM", () => {
    assert.equal(emailProductDisplayName(EMAIL_FROM), "HAR TaskApp");
  });

  it("falls back when EMAIL_FROM is a bare address", () => {
    assert.equal(emailProductDisplayName("notifications@carrick.my"), "HAR TaskApp");
  });
});

describe("buildWorkspaceFromHeader", () => {
  it("renders org via product with mailbox address", () => {
    assert.equal(
      buildWorkspaceFromHeader("Harrison Sabah", EMAIL_FROM),
      "Harrison Sabah via HAR TaskApp <notifications@carrick.my>"
    );
  });

  it("sanitises org name and quotes when needed", () => {
    const org = 'Acme "HQ"\nLtd, <branch>';
    assert.equal(
      buildWorkspaceFromHeader(org, EMAIL_FROM),
      '"Acme HQ Ltd, branch" via HAR TaskApp <notifications@carrick.my>'
    );
  });
});

describe("sanitizeOrgNameForHeader", () => {
  it("strips quotes, angle brackets, and newlines", () => {
    assert.equal(sanitizeOrgNameForHeader('Foo\n<bar> "baz"'), "Foo bar baz");
  });
});
