import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    assert.equal(escapeHtml(`<script>"x"&</script>`), "&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;");
  });
});
