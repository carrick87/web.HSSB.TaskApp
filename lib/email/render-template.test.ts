import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { renderEmailTemplate } from "./render-template";
import { emailDarkModeStyles } from "./components";

const EMAIL_FROM = "HAR TaskApp <notifications@carrick.my>";

const sampleBranding = {
  orgId: "org-1",
  orgName: "Acme <script> Ltd",
  logoWidePath: null,
  postalAddress: null as string | null,
};

const sampleBrandingWithAddress = {
  ...sampleBranding,
  postalAddress: "12 Jalan Example, Kuching",
};

describe("renderEmailTemplate task_digest", () => {
  it("escapes user-supplied org and task titles in HTML", async () => {
    const rendered = await renderEmailTemplate({
      template: "task_digest",
      payload: {
        frequency: "Daily",
        openCount: 1,
        dueTodayCount: 0,
        overdueCount: 1,
        summaryDate: "2026-09-27",
        tasks: [
          {
            title: 'Task "alert" & <bad>',
            url: "https://app.example.com/pm/tasks/1",
            dueKind: "overdue",
            dueDateFormatted: "25/09/2026",
            statusLabel: "To do",
            metaSuffix: "Assigned to you",
          },
        ],
        dashboardUrl: "https://app.example.com/dashboard",
      },
      branding: sampleBranding,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
      timezone: "Asia/Kuching",
      dateFormat: "DD/MM/YYYY",
    });

    assert.match(rendered.html, /Acme &lt;script&gt; Ltd/);
    assert.match(rendered.html, /Task &quot;alert&quot; &amp; &lt;bad&gt;/);
    assert.doesNotMatch(rendered.html, /<script>alert/);
  });

  it("omits postal address line when organization address is unset", async () => {
    const rendered = await renderEmailTemplate({
      template: "task_digest",
      payload: {
        frequency: "Daily",
        openCount: 2,
        dueTodayCount: 1,
        overdueCount: 0,
        summaryDate: "2026-09-27",
        tasks: [],
        dashboardUrl: "https://app.example.com/dashboard",
      },
      branding: sampleBranding,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
    });

    assert.doesNotMatch(rendered.html, /Example Tower/);
    assert.doesNotMatch(rendered.html, /Jalan Example/);
    assert.match(rendered.html, /Sent by HAR TaskApp/);
  });

  it("includes org name and address when set", async () => {
    const rendered = await renderEmailTemplate({
      template: "workspace_invite",
      payload: {
        inviterName: "Alex",
        acceptUrl: "https://app.example.com/invite/x",
        roleLabel: "Member",
      },
      branding: sampleBrandingWithAddress,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
    });

    assert.match(rendered.html, /Acme &lt;script&gt; Ltd · 12 Jalan Example, Kuching/);
  });

  it("uses product label from EMAIL_FROM instead of hardcoded TaskApp", async () => {
    const rendered = await renderEmailTemplate({
      template: "welcome_workspace",
      payload: { ownerName: "Jamie", dashboardUrl: "https://app.example.com/dashboard" },
      branding: sampleBranding,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
    });

    assert.match(rendered.html, /Sent by HAR TaskApp/);
    assert.match(rendered.html, />HAR TaskApp</);
    assert.doesNotMatch(rendered.html, />TaskApp</);
  });

  it("declares light/dark color scheme and dark-mode CSS hooks", async () => {
    const rendered = await renderEmailTemplate({
      template: "task_digest",
      payload: {
        frequency: "Daily",
        openCount: 1,
        dueTodayCount: 1,
        overdueCount: 0,
        summaryDate: "2026-09-27",
        tasks: [],
        dashboardUrl: "https://app.example.com/dashboard",
      },
      branding: sampleBranding,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
    });

    assert.match(rendered.html, /name="color-scheme" content="light dark"/);
    assert.match(rendered.html, /@media \(prefers-color-scheme:dark\)/);
    assert.match(rendered.html, /\[data-ogsc\]/);
    assert.match(rendered.html, /\[data-ogsb\]/);
    assert.ok(emailDarkModeStyles.includes("supported-color-schemes"));
  });

  it("uses bulletproof button padding without fixed height", async () => {
    const rendered = await renderEmailTemplate({
      template: "task_digest",
      payload: {
        frequency: "Daily",
        openCount: 1,
        dueTodayCount: 0,
        overdueCount: 0,
        summaryDate: "2026-09-27",
        tasks: [],
        dashboardUrl: "https://app.example.com/dashboard",
      },
      branding: sampleBranding,
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
    });

    assert.match(rendered.html, /padding:13px 28px/);
    assert.doesNotMatch(rendered.html, /height:44px/);
    assert.match(rendered.html, /Open my tasks/);
  });

  it("writes digest preview HTML artifacts", async () => {
    const outDir = "/opt/cursor/artifacts/emails";
    fs.mkdirSync(outDir, { recursive: true });
    const rendered = await renderEmailTemplate({
      template: "task_digest",
      payload: {
        frequency: "Daily",
        openCount: 5,
        dueTodayCount: 2,
        overdueCount: 1,
        summaryDate: "2026-09-27",
        tasks: [
          {
            title: "Renew forklift licence – Kota Kinabalu",
            url: "https://app.example.com/pm/tasks/1",
            dueKind: "overdue",
            dueDateFormatted: "25/09/2026",
            statusLabel: "In progress",
            metaSuffix: "Assigned to you",
          },
          {
            title: "Monthly stock count report",
            url: "https://app.example.com/pm/tasks/2",
            dueKind: "due_today",
            statusLabel: "To do",
            metaSuffix: "Assigned to you",
          },
          {
            title: "Update visitor tag labels",
            url: "https://app.example.com/pm/tasks/3",
            dueKind: "due_today",
            statusLabel: "To do",
            metaSuffix: "You're watching",
          },
        ],
        dashboardUrl: "https://app.example.com/dashboard",
      },
      branding: {
        orgId: "preview",
        orgName: "Harrison Sabah Sdn Bhd",
        postalAddress: "12 Jalan Tun Abang Haji Openg, 93000 Kuching, Sarawak",
      },
      appUrl: "https://app.example.com",
      emailFrom: EMAIL_FROM,
      timezone: "Asia/Kuching",
      dateFormat: "DD/MM/YYYY",
    });

    const lightPath = path.join(outDir, "digest-light.html");
    const darkPath = path.join(outDir, "digest-dark-forced.html");
    fs.writeFileSync(lightPath, rendered.html);
    fs.writeFileSync(
      darkPath,
      rendered.html.replace(
        "<head>",
        '<head><meta name="color-scheme" content="dark"><style>html{color-scheme:dark!important}body{background:#1D2125!important}.bg{background:#1D2125!important}.card{background:#22272B!important;border-color:#38414A!important}.h1,.strong{color:#DEE4EA!important}.body{color:#B6C2CF!important}.muted{color:#8C9BAB!important}</style>'
      )
    );
    assert.ok(fs.statSync(lightPath).size > 500);
    assert.ok(fs.statSync(darkPath).size > 500);
  });
});
