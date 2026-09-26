"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AddMemberPanel } from "@/components/settings/AddMemberPanel";
import { ORG_ROLES, formatOrgRoleLabel } from "@/lib/org/roles";

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

function countActiveOwners(users: UserRow[]) {
  return users.filter((u) => u.role === ORG_ROLES.OWNER && u.status === "active").length;
}

function isLastActiveOwner(user: UserRow, users: UserRow[]) {
  return user.role === ORG_ROLES.OWNER && user.status === "active" && countActiveOwners(users) <= 1;
}

function isElevatedRole(role: string) {
  return role === ORG_ROLES.OWNER || role === ORG_ROLES.ADMIN;
}

export function MembersClient({
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

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b.id, b.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [branches]);

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
    const res = await fetch("/api/settings/members");
    if (!res.ok) return;
    const data = await res.json();
    const rows = (data.members ?? []).map((m: Record<string, unknown>) => ({
      id: m.user_id as string,
      username: (m.username as string) ?? "—",
      harrison_email: (m.harrison_email as string | null) ?? null,
      auth_email: (m.auth_email as string) ?? "",
      role: m.role as string,
      status: m.status as string,
      last_sign_in_at: (m.last_sign_in_at as string | null) ?? null,
      branch_id: (m.branch_id as string | null) ?? null,
      department_id: (m.department_id as string | null) ?? null,
    }));
    setUsers(rows);
  }

  async function applyUserUpdate(id: string, patch: Partial<UserRow>) {
    setError(null);
    const existing = users.find((u) => u.id === id);
    if (!existing) return false;
    const res = await fetch(`/api/settings/members/${id}`, {
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
    setMessage("Member updated.");
    await refreshUsers();
    return true;
  }

  function requestRoleChange(user: UserRow, newRole: string) {
    if (user.id === currentUserId) return;
    if (newRole === user.role) return;
    if (newRole === ORG_ROLES.OWNER) {
      setError("Use ownership transfer to promote to owner.");
      return;
    }
    const touchesElevated = isElevatedRole(newRole) || isElevatedRole(user.role);
    if (touchesElevated) {
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
    if (user.status === "active" && isLastActiveOwner(user, users)) {
      setError("Cannot deactivate the last active owner.");
      return;
    }
    const next = user.status === "active" ? "deactivated" : "active";
    const res = await fetch(`/api/settings/members/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Status update failed.");
      return;
    }
    setMessage(next === "active" ? "Member reactivated." : "Member deactivated.");
    await refreshUsers();
  }

  const lastOwnerHint =
    "This is the only active owner. Promote another owner or transfer ownership before deactivating.";

  const roleOptions = [
    ORG_ROLES.ADMIN,
    ORG_ROLES.MANAGER,
    ORG_ROLES.MEMBER,
  ];

  return (
    <div className="space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">Members</h1>
          <p className="text-sm text-neutral-700 mt-0.5">Manage roles, branches, and membership in this organization.</p>
        </div>
        <Button type="button" onClick={() => setShowAdd(true)} className="min-h-[44px]">
          Add member
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
            <option value={ORG_ROLES.OWNER}>{formatOrgRoleLabel(ORG_ROLES.OWNER)}</option>
            <option value={ORG_ROLES.ADMIN}>{formatOrgRoleLabel(ORG_ROLES.ADMIN)}</option>
            <option value={ORG_ROLES.MANAGER}>{formatOrgRoleLabel(ORG_ROLES.MANAGER)}</option>
            <option value={ORG_ROLES.MEMBER}>{formatOrgRoleLabel(ORG_ROLES.MEMBER)}</option>
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

      {users.length <= 1 && (
        <EmptyState
          title="Invite your first teammate"
          description="You're the first person in this workspace. Add colleagues when you're ready — no branch or department setup required."
          actionLabel="Add member"
          actionHref="/settings/members"
        />
      )}

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
              const lastOwner = isLastActiveOwner(u, users);
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-b border-neutral-100 align-top ${inactive ? "opacity-75" : ""}`}>
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
                    {u.role !== ORG_ROLES.OWNER && (
                      <select
                        className="atlassian-select min-h-[44px] w-full max-w-[180px]"
                        value={u.role}
                        disabled={self || (lastOwner && u.role === ORG_ROLES.OWNER)}
                        title={self ? "You cannot change your own role." : undefined}
                        onChange={(e) => requestRoleChange(u, e.target.value)}
                      >
                        {u.role === ORG_ROLES.OWNER && <option value={ORG_ROLES.OWNER}>Owner</option>}
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>{formatOrgRoleLabel(r)}</option>
                        ))}
                      </select>
                    )}
                    {self && <p className="text-xs text-neutral-700">You cannot change your own role.</p>}
                  </td>
                  <td className="py-3 pr-3 text-neutral-800">{branchName(u.branch_id)}</td>
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
                          disabled={lastOwner}
                          title={lastOwner ? lastOwnerHint : undefined}
                          onClick={() => toggleStatus(u)}
                        >
                          Deactivate
                        </Button>
                        {lastOwner && <p className="text-xs text-neutral-700 max-w-[200px]">{lastOwnerHint}</p>}
                      </>
                    )}
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
          const lastOwner = isLastActiveOwner(u, users);
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
                <p className="text-neutral-800">{branchName(u.branch_id)}</p>
                {!self && u.role !== ORG_ROLES.OWNER && (
                  <select
                    className="atlassian-select min-h-[44px] w-full"
                    value={u.role}
                    onChange={(e) => requestRoleChange(u, e.target.value)}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>{formatOrgRoleLabel(r)}</option>
                    ))}
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
                      disabled={lastOwner}
                      onClick={() => toggleStatus(u)}
                    >
                      Deactivate
                    </Button>
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

      <AddMemberPanel
        open={showAdd}
        onClose={() => setShowAdd(false)}
        branches={branches}
        departments={departments}
        onCreated={() => {
          setMessage("Member added.");
          void refreshUsers();
        }}
      />

      <ConfirmDialog
        open={!!roleConfirm}
        title="Change owner or admin role?"
        message={
          roleConfirm
            ? `Confirm changing ${roleConfirm.username}'s role to or from ${formatOrgRoleLabel(roleConfirm.newRole)}. This takes effect immediately.`
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
