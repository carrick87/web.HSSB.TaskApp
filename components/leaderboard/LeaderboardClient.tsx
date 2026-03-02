"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardClient({
  initialData,
  branches,
  departments,
}: {
  initialData: { leaderboard: LeaderboardEntry[]; period: string; month?: number; year?: number };
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; branch_id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(initialData.period || "month");
  const [month, setMonth] = useState(initialData.month ?? new Date().getMonth() + 1);
  const [year, setYear] = useState(initialData.year ?? new Date().getFullYear());
  const [branchId, setBranchId] = useState(searchParams.get("branch_id") ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("department_id") ?? "");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function applyFilters() {
    setLoading(true);
    const params = new URLSearchParams({
      period,
      month: String(month),
      year: String(year),
    });
    if (branchId) params.set("branch_id", branchId);
    if (departmentId) params.set("department_id", departmentId);
    const res = await fetch(`/api/leaderboard?${params}`);
    const json = await res.json().catch(() => ({}));
    setData(json);
    router.push(`/leaderboard?${params}`, { scroll: false });
    setLoading(false);
  }

  function exportExcel() {
    const params = new URLSearchParams({ period, month: String(month), year: String(year) });
    if (branchId) params.set("branch_id", branchId);
    if (departmentId) params.set("department_id", departmentId);
    window.location.href = `/api/leaderboard/export?${params}`;
  }

  const periodLabel =
    period === "month"
      ? `${year}-${String(month).padStart(2, "0")}`
      : period === "year"
        ? String(year)
        : "All time";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium">Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="all">All time</option>
            </select>
            {period === "month" && (
              <>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
                  className="w-14 rounded border px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  min={2020}
                  max={2030}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
              </>
            )}
            {period === "year" && (
              <input
                type="number"
                min={2020}
                max={2030}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                className="w-20 rounded border px-2 py-1 text-sm"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setDepartmentId(""); }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm"
            >
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm"
            >
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Button size="sm" onClick={applyFilters} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </Button>
            <Button size="sm" variant="secondary" onClick={exportExcel}>
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top performers — {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 font-medium">Rank</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Branch</th>
                  <th className="text-left py-2 font-medium">Department</th>
                  <th className="text-right py-2 font-medium">Points</th>
                  <th className="text-right py-2 font-medium">Completed</th>
                  <th className="text-right py-2 font-medium">Late</th>
                  <th className="text-right py-2 font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard?.slice(0, 20).map((row) => (
                  <tr
                    key={row.profile_id}
                    className={`border-b border-slate-100 dark:border-slate-700 ${
                      row.rank <= 3 ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
                    }`}
                  >
                    <td className="py-2">
                      {row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
                    </td>
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{row.branch}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{row.department}</td>
                    <td className="py-2 text-right font-semibold">{row.totalPoints}</td>
                    <td className="py-2 text-right">{row.completed}</td>
                    <td className="py-2 text-right">{row.late}</td>
                    <td className="py-2 text-right">{row.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!data.leaderboard?.length) && (
            <p className="text-slate-500 dark:text-slate-400 py-4">No data for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
