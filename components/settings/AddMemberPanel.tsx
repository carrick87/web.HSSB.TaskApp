"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ORG_ROLES, formatOrgRoleLabel } from "@/lib/org/roles";

type Branch = { id: string; name: string };
type Department = { id: string; name: string; branch_id: string };

type Props = {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  departments: Department[];
  onCreated: () => void;
};

export function AddMemberPanel({ open, onClose, branches, departments, onCreated }: Props) {
  const router = useRouter();
  const [createMethod, setCreateMethod] = useState<"invite" | "temp_password">("invite");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: ORG_ROLES.MEMBER as string,
    branch_id: "",
    department_id: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          create_method: createMethod,
          ...(createMethod === "invite" ? {} : { password: form.password }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not add member.");
        return;
      }
      setForm({
        username: "",
        email: "",
        password: "",
        role: ORG_ROLES.MEMBER,
        branch_id: "",
        department_id: "",
      });
      onCreated();
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const panel = (
    <form onSubmit={submit} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-1000">Add member</h2>
        <button type="button" className="min-h-[44px] min-w-[44px] text-neutral-700" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <fieldset className="space-y-2 mb-4">
        <legend className="atlassian-label">How to add</legend>
        <label className="flex items-center gap-2 min-h-[44px] text-sm">
          <input
            type="radio"
            name="create_method"
            checked={createMethod === "invite"}
            onChange={() => setCreateMethod("invite")}
          />
          Send email invite (default)
        </label>
        <label className="flex items-center gap-2 min-h-[44px] text-sm">
          <input
            type="radio"
            name="create_method"
            checked={createMethod === "temp_password"}
            onChange={() => setCreateMethod("temp_password")}
          />
          Set temporary password (must change on first sign-in)
        </label>
      </fieldset>

      <div className="space-y-3 flex-1 overflow-y-auto">
        <input
          className="atlassian-input"
          placeholder="Username"
          required={createMethod === "temp_password"}
          minLength={createMethod === "temp_password" ? 3 : undefined}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="atlassian-input"
          type="email"
          placeholder="Email for invite"
          required={createMethod === "invite"}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {createMethod === "temp_password" && (
          <input
            className="atlassian-input"
            type="password"
            placeholder="Temporary password (min 6 characters)"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        )}
        <select className="atlassian-select min-h-[44px]" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value={ORG_ROLES.MEMBER}>{formatOrgRoleLabel(ORG_ROLES.MEMBER)}</option>
          <option value={ORG_ROLES.MANAGER}>{formatOrgRoleLabel(ORG_ROLES.MANAGER)}</option>
          <option value={ORG_ROLES.ADMIN}>{formatOrgRoleLabel(ORG_ROLES.ADMIN)}</option>
        </select>
        <select
          className="atlassian-select min-h-[44px]"
          value={form.branch_id}
          onChange={(e) => setForm({ ...form, branch_id: e.target.value, department_id: "" })}
        >
          <option value="">Branch (optional)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          className="atlassian-select min-h-[44px]"
          value={form.department_id}
          onChange={(e) => setForm({ ...form, department_id: e.target.value })}
        >
          <option value="">Department (optional)</option>
          {departments
            .filter((d) => !form.branch_id || d.branch_id === form.branch_id)
            .map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex gap-2 justify-end pt-4 mt-auto">
        <Button type="button" variant="secondary" onClick={onClose} className="min-h-[44px]">Cancel</Button>
        <Button type="submit" disabled={loading} className="min-h-[44px]">{loading ? "Adding…" : "Add member"}</Button>
      </div>
    </form>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex-1 overflow-y-auto p-4">{panel}</div>
      </div>

      <div className="hidden lg:block fixed inset-0 z-50 pointer-events-none">
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
        <aside
          className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-xl pointer-events-auto p-6 overflow-y-auto"
          style={{ borderLeft: "1px solid #DFE1E6" }}
        >
          {panel}
        </aside>
      </div>
    </>
  );
}
