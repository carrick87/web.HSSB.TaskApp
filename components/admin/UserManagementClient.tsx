"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRoleLabel } from "@/lib/roles";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    branch_id: "",
    department_id: "",
  });

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.harrison_email ?? "").toLowerCase().includes(q) ||
        u.auth_email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  async function refreshUsers() {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  async function updateUser(id: string, patch: Partial<UserRow>) {
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
      return;
    }
    setMessage("User updated.");
    await refreshUsers();
  }

  async function toggleStatus(user: UserRow) {
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

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create user.");
      return;
    }
    setShowAdd(false);
    setNewUser({ username: "", email: "", password: "", role: "user", branch_id: "", department_id: "" });
    setMessage("User created.");
    await refreshUsers();
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-1000">User Management</h1>
          <p className="text-sm text-neutral-700 mt-0.5">Manage roles, branches, departments, and account status.</p>
        </div>
        <Button type="button" onClick={() => setShowAdd(true)}>Add user</Button>
      </div>

      {error && <div className="rounded-atlassian border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {message && <div className="rounded-atlassian border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

      <Card>
        <CardContent className="py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="atlassian-input md:col-span-1" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="atlassian-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </select>
          <select className="atlassian-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
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
              <th className="py-2 pr-3">Department</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Last sign-in</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 align-top">
                <td className="py-3 pr-3">
                  <input
                    className="atlassian-input min-h-[44px] py-2"
                    defaultValue={u.username}
                    onBlur={(e) => e.target.value !== u.username && updateUser(u.id, { username: e.target.value })}
                  />
                </td>
                <td className="py-3 pr-3 text-neutral-700">{u.harrison_email ?? u.auth_email}</td>
                <td className="py-3 pr-3">
                  <select
                    className="atlassian-select min-h-[44px]"
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    disabled={u.id === currentUserId && u.role === "super_admin"}
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </select>
                </td>
                <td className="py-3 pr-3">{u.branch?.name ?? "—"}</td>
                <td className="py-3 pr-3">{u.department?.name ?? "—"}</td>
                <td className="py-3 pr-3"><Badge className={u.status === "active" ? "bg-green-100 text-green-800" : "bg-neutral-200"}>{u.status}</Badge></td>
                <td className="py-3 pr-3 text-neutral-700">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                <td className="py-3 space-y-2">
                  <Button type="button" variant="secondary" onClick={() => toggleStatus(u)}>
                    {u.status === "active" ? "Deactivate" : "Reactivate"}
                  </Button>
                  <Link href={`/admin/users/${u.id}`} className="block text-xs text-brand-700 hover:underline">
                    Edit / set password
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardHeader><CardTitle>{u.username}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-neutral-700">{u.harrison_email ?? u.auth_email}</p>
              <p>{formatRoleLabel(u.role)} · {u.status}</p>
              <p>{u.branch?.name ?? "No branch"} / {u.department?.name ?? "No department"}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => toggleStatus(u)}>
                  {u.status === "active" ? "Deactivate" : "Reactivate"}
                </Button>
                <Link href={`/admin/users/${u.id}`} className="text-brand-700 text-sm self-center">Edit</Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent audit log</CardTitle></CardHeader>
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

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader><CardTitle>Add user</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createUser}>
                <input className="atlassian-input" placeholder="Username" required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                <input className="atlassian-input" placeholder="Harrison email (optional)" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                <input className="atlassian-input" type="password" placeholder="Temporary password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                <select className="atlassian-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <select className="atlassian-select" value={newUser.branch_id} onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}>
                  <option value="">Branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className="atlassian-select" value={newUser.department_id} onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}>
                  <option value="">Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit">Create user</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
