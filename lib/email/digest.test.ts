import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDigestPreheader,
  buildDigestTaskRows,
  countDueToday,
  shouldSkipDigest,
} from "./digest";

describe("shouldSkipDigest", () => {
  it("skips when there are no open or overdue tasks", () => {
    assert.equal(shouldSkipDigest(0, 0), true);
  });

  it("sends when there are open tasks even without overdue", () => {
    assert.equal(shouldSkipDigest(3, 0), false);
  });

  it("sends when there are overdue tasks", () => {
    assert.equal(shouldSkipDigest(0, 2), false);
  });
});

describe("countDueToday", () => {
  it("counts tasks due on the local date", () => {
    const tasks = [
      { id: "1", title: "A", due_date: "2026-09-27", status: "todo" },
      { id: "2", title: "B", due_date: "2026-09-28", status: "todo" },
      { id: "3", title: "C", due_date: "2026-09-27T00:00:00Z", status: "todo" },
    ];
    assert.equal(countDueToday(tasks, "2026-09-27"), 2);
  });
});

describe("buildDigestTaskRows", () => {
  it("orders overdue before due today and labels rows", () => {
    const rows = buildDigestTaskRows(
      [
        { id: "a", title: "Future", due_date: "2026-10-01", status: "todo" },
        { id: "b", title: "Today", due_date: "2026-09-27", status: "in_progress" },
        { id: "c", title: "Late", due_date: "2026-09-20", status: "todo" },
      ],
      "2026-09-27",
      (id) => `https://app/tasks/${id}`,
      () => "20/09/2026"
    );
    assert.equal(rows[0].title, "Late");
    assert.equal(rows[0].dueKind, "overdue");
    assert.equal(rows[1].title, "Today");
    assert.equal(rows[1].dueKind, "due_today");
    assert.equal(rows[2].dueKind, "none");
  });
});

describe("buildDigestPreheader", () => {
  it("includes due today, overdue, and summary date", () => {
    const pre = buildDigestPreheader({
      dueTodayCount: 2,
      overdueCount: 1,
      summaryDateLabel: "Sun, 27/09/2026",
    });
    assert.match(pre, /2 tasks due today, 1 overdue/);
    assert.match(pre, /Sun, 27\/09\/2026/);
  });
});
