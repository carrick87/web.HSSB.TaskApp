import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkspaceFromHeader,
  emailProductDisplayName,
  sanitizeOrgNameForHeader,
} from "./format";

const EMAIL_FROM = "HAR TaskApp <notifications@carrick.my>";

const expectedFrom = (orgLabel: string) =>
  `"${orgLabel} via HAR TaskApp" <notifications@carrick.my>`;

describe("emailProductDisplayName", () => {
  it("uses display name from EMAIL_FROM", () => {
    assert.equal(emailProductDisplayName(EMAIL_FROM), "HAR TaskApp");
  });

  it("falls back when EMAIL_FROM is a bare address", () => {
    assert.equal(emailProductDisplayName("notifications@carrick.my"), "HAR TaskApp");
  });
});

describe("buildWorkspaceFromHeader", () => {
  it("quotes Harrison Sabah Sdn Bhd", () => {
    assert.equal(
      buildWorkspaceFromHeader("Harrison Sabah Sdn Bhd", EMAIL_FROM),
      expectedFrom("Harrison Sabah Sdn Bhd")
    );
  });

  it("quotes ABC (M) Sdn. Bhd.", () => {
    assert.equal(
      buildWorkspaceFromHeader("ABC (M) Sdn. Bhd.", EMAIL_FROM),
      expectedFrom("ABC (M) Sdn. Bhd.")
    );
  });

  it("quotes Acme: Ltd", () => {
    assert.equal(buildWorkspaceFromHeader("Acme: Ltd", EMAIL_FROM), expectedFrom("Acme: Ltd"));
  });

  it("keeps evil@attacker.com inside the quoted display name", () => {
    assert.equal(
      buildWorkspaceFromHeader("evil@attacker.com", EMAIL_FROM),
      expectedFrom("evil@attacker.com")
    );
  });

  it("sanitises NUL and U+2028 then quotes", () => {
    const org = "Acme\u0000Line\u2028Break";
    assert.equal(buildWorkspaceFromHeader(org, EMAIL_FROM), expectedFrom("Acme Line Break"));
  });

  it("uses Workspace when org name is empty after sanitisation", () => {
    assert.equal(buildWorkspaceFromHeader("   \u0000  ", EMAIL_FROM), expectedFrom("Workspace"));
  });

  it("escapes backslash and double quote in the display name", () => {
    assert.equal(
      buildWorkspaceFromHeader('Say "hi" \\ there', EMAIL_FROM),
      `"Say hi \\\\ there via HAR TaskApp" <notifications@carrick.my>`
    );
  });
});

describe("sanitizeOrgNameForHeader", () => {
  it("strips quotes, angle brackets, control chars, and collapses whitespace", () => {
    assert.equal(sanitizeOrgNameForHeader('Foo\n<bar> "baz"\u0000x'), "Foo bar baz x");
  });

  it("returns empty string for whitespace-only input", () => {
    assert.equal(sanitizeOrgNameForHeader("  \u2029  "), "");
  });
});
