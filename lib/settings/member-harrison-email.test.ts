import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tempPasswordHarrisonEmail } from "./member-harrison-email";

describe("tempPasswordHarrisonEmail", () => {
  it("returns lowercase normalized email for profile storage", () => {
    assert.equal(tempPasswordHarrisonEmail("Admin@Harrisons.COM.MY"), "admin@harrisons.com.my");
  });

  it("returns null when email is absent", () => {
    assert.equal(tempPasswordHarrisonEmail(""), null);
    assert.equal(tempPasswordHarrisonEmail("   "), null);
  });
});
