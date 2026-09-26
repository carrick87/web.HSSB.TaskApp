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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="period" className="atlassian-label">Period</label>
              <select
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="atlassian-select w-28"
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
                <option value="all">All time</option>
              </select>
            </div>
            {period === "month" && (
              <>
                <div>
                  <label htmlFor="month" className="atlassian-label">Month</label>
                  <input
                    id="month"
                    type="number"
                    min={1}
                    max={12}
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10) || 1)}
                    className="atlassian-input w-16"
                  />
                </div>
                <div>
                  <label htmlFor="year" className="atlassian-label">Year</label>
                  <input
                    id="year"
                    type="number"
                    min={2020}
                    max={2030}
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    className="atlassian-input w-20"
                  />
                </div>
              </>
            )}
            {period === "year" && (
              <div>
                <label htmlFor="year-only" className="atlassian-label">Year</label>
                <input
                  id="year-only"
                  type="number"
                  min={2020}
                  max={2030}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                  className="atlassian-input w-20"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="branch" className="atlassian-label">Branch</label>
              <select
                id="branch"
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setDepartmentId(""); }}
                className="atlassian-select w-40"
              >
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="department" className="atlassian-label">Department</label>
              <select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="atlassian-select w-40"
              >
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={applyFilters} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </Button>
            <Button size="sm" variant="secondary" onClick={exportExcel}>
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rankings</CardTitle>
          <span className="text-xs text-neutral-700 font-normal">{periodLabel}</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide">Rank</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide hidden sm:table-cell">Branch</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide hidden md:table-cell">Department</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide">Points</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide hidden lg:table-cell">Done</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide hidden lg:table-cell">Late</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-700 uppercase tracking-wide hidden lg:table-cell">Failed</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard?.slice(0, 20).map((row) => (
                  <tr
                    key={row.profile_id}
                    className={`border-b border-neutral-100 ${
                      row.rank <= 3 ? "bg-atlassian-yellow-light/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {row.rank <= 3 ? (
                        <span className="text-lg">{MEDALS[row.rank - 1]}</span>
                      ) : (
                        <span className="text-neutral-700">{row.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-neutral-1000">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700 hidden sm:table-cell">{row.branch || "—"}</td>
                    <td className="px-4 py-3 text-neutral-700 hidden md:table-cell">{row.department || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-700">{row.totalPoints}</td>
                    <td className="px-4 py-3 text-right text-atlassian-green hidden lg:table-cell">{row.completed}</td>
                    <td className="px-4 py-3 text-right text-atlassian-yellow hidden lg:table-cell">{row.late}</td>
                    <td className="px-4 py-3 text-right text-atlassian-red hidden lg:table-cell">{row.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!data.leaderboard?.length) && (
            <div className="px-4 py-8 text-center">
              <p className="text-neutral-700 text-sm">No data for this period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
