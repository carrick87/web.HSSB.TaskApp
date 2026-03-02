"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function EditUserForm({
  profile,
  branches,
  departments,
}: {
  profile: { id: string; username: string; harrison_email: string | null; role: string; branch_id: string | null; department_id: string | null };
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string; branch_id: string }>;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [harrisonEmail, setHarrisonEmail] = useState(profile.harrison_email ?? "");
  const [role, setRole] = useState(profile.role);
  const [branchId, setBranchId] = useState(profile.branch_id ?? "");
  const [departmentId, setDepartmentId] = useState(profile.department_id ?? "");
  const [loading, setLoading] = useState(false);
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (harrisonEmail.trim() && !harrisonEmail.trim().toLowerCase().endsWith("@harrisons.com.my")) {
      setError("Email must end with @harrisons.com.my.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          harrison_email: harrisonEmail.trim() || null,
          role,
          branch_id: branchId || null,
          department_id: departmentId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSetPasswordSuccess(false);
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setSetPasswordLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${profile.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to set password");
        return;
      }
      setSetPasswordSuccess(true);
      setNewPassword("");
      setNewPasswordConfirm("");
    } finally {
      setSetPasswordLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
            required
            minLength={3}
          />
        </div>
        <p className="text-sm text-slate-500">Email (for recording):</p>
        <input
          type="email"
          value={harrisonEmail}
          onChange={(e) => setHarrisonEmail(e.target.value)}
          placeholder="you@harrisons.com.my"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
          >
            <option value="staff">Staff</option>
            <option value="pic">PIC</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch</label>
          <select
            value={branchId}
            onChange={(e) => { setBranchId(e.target.value); setDepartmentId(""); }}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
          >
            <option value="">—</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
          >
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {setPasswordSuccess && <p className="text-sm text-green-600 dark:text-green-400">Password updated.</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </div>
      </form>

      <form onSubmit={handleSetPassword} className="mt-8 p-4 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3">
        <h3 className="font-medium text-slate-800 dark:text-slate-200">Set new password</h3>
        <p className="text-sm text-slate-500">Only admins can set a new password for this user.</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
            placeholder="At least 6 characters"
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm new password</label>
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2"
            placeholder="Repeat password"
            minLength={6}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={setPasswordLoading}>
          {setPasswordLoading ? "Setting…" : "Set new password"}
        </Button>
      </form>
    </>
  );
}
