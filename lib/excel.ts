import * as XLSX from "xlsx";

export function buildTaskInstancesSheet(rows: Array<{
  taskName: string;
  assignee: string;
  branch: string;
  department: string;
  assignmentDate: string;
  dueDate: string;
  status: string;
  submittedAt: string | null;
  isLate: boolean;
  picComment: string | null;
}>) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      "Task Name": r.taskName,
      Assignee: r.assignee,
      Branch: r.branch,
      Department: r.department,
      "Assignment Date": r.assignmentDate,
      "Due Date": r.dueDate,
      Status: r.status,
      "Submitted At": r.submittedAt ?? "",
      "Is Late": r.isLate ? "Yes" : "No",
      "PIC Comment": r.picComment ?? "",
    }))
  );
  return ws;
}

export function buildLeaderboardSheet(rows: Array<{
  rank: number;
  name: string;
  branch: string;
  department: string;
  totalPoints: number;
  completed: number;
  late: number;
  failed: number;
}>) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Rank: r.rank,
      Name: r.name,
      Branch: r.branch,
      Department: r.department,
      "Total Points": r.totalPoints,
      Completed: r.completed,
      Late: r.late,
      Failed: r.failed,
    }))
  );
  return ws;
}

export function sheetToBuffer(ws: XLSX.WorkSheet, sheetName = "Sheet1") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
