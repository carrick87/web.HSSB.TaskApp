"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AddUserPanel } from "@/components/admin/AddUserPanel";
import { ROLES } from "@/lib/roles";

type Branch = { id: string; name: string };
type Department = { id: string; name: string; branch_id: string };
type UserRow = {
  id: string;
  username: string;
  harrison_email: string | null;
  auth_email: string;
  role: string;
  status: string;
  last_sign_in_at: string | null;
  branch_id: string | null;
  department_id: string | null;
  branch?: { name: string } | null;
  department?: { name: string } | null;
};
type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
};

type Props = {
  initialUsers: UserRow[];
  branches: Branch[];
  departments: Department[];
  auditLogs: AuditRow[];
  currentUserId: string;
};

function countActiveSuperAdmins(users: UserRow[]) {
  return users.filter((u) => u.role === ROLES.SUPER_ADMIN && u.status === "active").length;
}

function isLastActiveSuperAdmin(user: UserRow, users: UserRow[]) {
  return (
    user.role === ROLES.SUPER_ADMIN &&
    user.status === "active" &&
    countActiveSuperAdmins(users) <= 1
  );
}

export function UserManagementClient({
  initialUsers,
  branches,
  departments,
  auditLogs,
  currentUserId,
}: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<{
    userId: string;
    newRole: string;
    username: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.harrison_email ?? "").toLowerCase().includes(q) ||
        u.auth_email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesBranch = branchFilter === "all" || u.branch_id === branchFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.status === "active") ||
        (statusFilter === "inactive" && u.status === "deactivated");
      return matchesQuery && matchesRole && matchesBranch && matchesStatus;
    });
  }, [users, query, roleFilter, branchFilter, statusFilter]);

  async function refreshUsers() {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  async function applyUserUpdate(id: string, patch: Partial<UserRow>) {
    setError(null);
    const existing = users.find((u) => u.id === id);
    if (!existing) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: patch.username ?? existing.username,
        harrison_email: patch.harrison_email ?? existing.harrison_email,
        role: patch.role ?? existing.role,
        branch_id: patch.branch_id ?? existing.branch_id,
        department_id: patch.department_id ?? existing.department_id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Update failed.");
      return false;
    }
    setMessage("User updated.");
    await refreshUsers();
    return true;
  }

  function requestRoleChange(user: UserRow, newRole: string) {
    if (user.id === currentUserId) return;
    if (newRole === user.role) return;
    const touchesSuperAdmin =
      newRole === ROLES.SUPER_ADMIN || user.role === ROLES.SUPER_ADMIN;
    if (touchesSuperAdmin) {
      setRoleConfirm({ userId: user.id, newRole, username: user.username });
      return;
    }
    void applyUserUpdate(user.id, { role: newRole });
  }

  async function confirmRoleChange() {
    if (!roleConfirm) return;
    setConfirmLoading(true);
    const ok = await applyUserUpdate(roleConfirm.userId, { role: roleConfirm.newRole });
    setConfirmLoading(false);
    if (ok) setRoleConfirm(null);
  }

  async function toggleStatus(user: UserRow) {
    if (user.status === "active" && isLastActiveSuperAdmin(user, users)) {
      setError("Cannot deactivate the last active super admin.");
      return;
    }
    const next = user.status === "active" ? "deactivated" : "active";
    const res = await fetch(`/api/admin/users/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Status update failed.");
      return;
    }
    setMessage(next === "active" ? "User reactivated." : "User deactivated.");
    await refreshUsers();
  }

  const lastSuperAdminHint =
    "This is the only active super admin. Promote another super admin or deactivate someone else first.";

  return (
    <div className="space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">User Management</h1>
          <p className="text-sm text-neutral-700 mt-0.5">Manage roles, branches, and account status.</p>
        </div>
        <Button type="button" onClick={() => setShowAdd(true)} className="min-h-[44px]">
          Add user
        </Button>
      </div>

      {error && (
        <div className="rounded-atlassian border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {message && (
        <div className="rounded-atlassian border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
      )}

      <Card>
        <CardContent className="py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="atlassian-input lg:col-span-1 sm:col-span-2"
            placeholder="Search name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="atlassian-select min-h-[44px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
          <select className="atlassian-select min-h-[44px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select className="atlassian-select min-h-[44px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </CardContent>
      </Card>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-700 border-b border-neutral-200">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Branch</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Last sign-in</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const inactive = u.status === "deactivated";
              const lastSa = isLastActiveSuperAdmin(u, users);
              const self = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className={`border-b border-neutral-100 align-top ${inactive ? "opacity-75" : ""}`}
                >
                  <td className="py-3 pr-3">
                    <input
                      className="atlassian-input min-h-[44px] py-2"
                      defaultValue={u.username}
                      onBlur={(e) => e.target.value !== u.username && applyUserUpdate(u.id, { username: e.target.value })}
                    />
                  </td>
                  <td className="py-3 pr-3 text-neutral-800">{u.harrison_email ?? u.auth_email}</td>
                  <td className="py-3 pr-3 space-y-2">
                    <RoleBadge role={u.role} />
                    <select
                      className="atlassian-select min-h-[44px] w-full max-w-[180px]"
                      value={u.role}
                      disabled={self || (lastSa && u.role === ROLES.SUPER_ADMIN)}
                      title={
                        self
                          ? "You cannot change your own role."
                          : lastSa && u.role === ROLES.SUPER_ADMIN
                            ? lastSuperAdminHint
                            : undefined
                      }
                      onChange={(e) => requestRoleChange(u, e.target.value)}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="manager" disabled={lastSa && u.role === ROLES.SUPER_ADMIN}>
                        Manager
                      </option>
                      <option value="user" disabled={lastSa && u.role === ROLES.SUPER_ADMIN}>
                        User
                      </option>
                    </select>
                    {self && <p className="text-xs text-neutral-700">You cannot change your own role.</p>}
                  </td>
                  <td className="py-3 pr-3 text-neutral-800">{u.branch?.name ?? "—"}</td>
                  <td className="py-3 pr-3">
                    {inactive ? (
                      <span className="inline-flex px-2 py-1 rounded-atlassian text-xs font-medium bg-neutral-200 text-neutral-800">
                        Inactive
                      </span>
                    ) : (
                      <span className="text-neutral-800">Active</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-neutral-700">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 space-y-2">
                    {inactive ? (
                      <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => toggleStatus(u)}>
                        Reactivate
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px]"
                          disabled={lastSa}
                          title={lastSa ? lastSuperAdminHint : undefined}
                          onClick={() => toggleStatus(u)}
                        >
                          Deactivate
                        </Button>
                        {lastSa && <p className="text-xs text-neutral-700 max-w-[200px]">{lastSuperAdminHint}</p>}
                      </>
                    )}
                    <Link href={`/admin/users/${u.id}`} className="block text-xs text-brand-700 hover:underline">
                      Edit / set password
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map((u) => {
          const inactive = u.status === "deactivated";
          const lastSa = isLastActiveSuperAdmin(u, users);
          const self = u.id === currentUserId;
          return (
            <Card key={u.id} className={inactive ? "opacity-75" : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-neutral-900">{u.username}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-neutral-800">{u.harrison_email ?? u.auth_email}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={u.role} />
                  {inactive ? (
                    <span className="inline-flex px-2 py-1 rounded-atlassian text-xs font-medium bg-neutral-200 text-neutral-800">
                      Inactive
                    </span>
                  ) : (
                    <span className="text-neutral-700">Active</span>
                  )}
                </div>
                <p className="text-neutral-800">{u.branch?.name ?? "No branch"}</p>
                {!self && (
                  <select
                    className="atlassian-select min-h-[44px] w-full"
                    value={u.role}
                    onChange={(e) => requestRoleChange(u, e.target.value)}
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </select>
                )}
                {self && <p className="text-xs text-neutral-700">You cannot change your own role.</p>}
                <div className="flex flex-wrap gap-2">
                  {inactive ? (
                    <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => toggleStatus(u)}>
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      disabled={lastSa}
                      onClick={() => toggleStatus(u)}
                    >
                      Deactivate
                    </Button>
                  )}
                  {lastSa && !inactive && (
                    <p className="text-xs text-neutral-700 w-full">{lastSuperAdminHint}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {auditLogs.length === 0 && <p className="text-neutral-700">No audit entries yet.</p>}
          {auditLogs.map((log) => (
            <div key={log.id} className="border-b border-neutral-100 pb-2">
              <div className="font-medium text-neutral-900">{log.action}</div>
              <div className="text-neutral-700">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddUserPanel
        open={showAdd}
        onClose={() => setShowAdd(false)}
        branches={branches}
        departments={departments}
        onCreated={() => {
          setMessage("User created.");
          void refreshUsers();
        }}
      />

      <ConfirmDialog
        open={!!roleConfirm}
        title="Change super admin role?"
        message={
          roleConfirm
            ? `Confirm changing ${roleConfirm.username}'s role to or from Super Admin. This takes effect immediately.`
            : ""
        }
        confirmLabel="Change role"
        onConfirm={() => void confirmRoleChange()}
        onCancel={() => setRoleConfirm(null)}
        loading={confirmLoading}
      />
    </div>
  );
}
