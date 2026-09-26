"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ReportsForm({
  branches,
  departments,
}: {
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; branch_id: string }>;
}) {
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  function handleExport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set("branch_id", branchId);
    if (departmentId) params.set("department_id", departmentId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    window.location.href = `/api/reports/export?${params.toString()}`;
    setTimeout(() => setLoading(false), 1000);
  }

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <label className="atlassian-label">
          Branch
        </label>
        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setDepartmentId("");
          }}
          className="atlassian-input text-neutral-1000"
        >
          <option value="">All</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="atlassian-label">
          Department
        </label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="atlassian-input text-neutral-1000"
        >
          <option value="">All</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="atlassian-label">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="atlassian-input text-neutral-1000"
          />
        </div>
        <div>
          <label className="atlassian-label">
            End date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="atlassian-input text-neutral-1000"
          />
        </div>
      </div>
      <Button onClick={handleExport} disabled={loading}>
        {loading ? "Preparing…" : "Export to Excel"}
      </Button>
    </div>
  );
}
