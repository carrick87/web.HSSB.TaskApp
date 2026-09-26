type TaskStatus =
  | "pending"
  | "accepted"
  | "submitted"
  | "verified"
  | "rejected"
  | "failed";

const statusClasses: Record<TaskStatus, string> = {
  pending: "bg-atlassian-yellow-light text-yellow-700 border border-yellow-200",
  accepted: "bg-brand-50 text-brand-800 border border-brand-200",
  submitted: "bg-atlassian-purple-light text-atlassian-purple border border-purple-200",
  verified: "bg-atlassian-green-light text-green-700 border border-green-200",
  rejected: "bg-atlassian-red-light text-atlassian-red border border-red-200",
  failed: "bg-neutral-200 text-neutral-700 border border-neutral-300",
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-atlassian px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

type LozengeAppearance = "default" | "success" | "inprogress" | "new" | "moved" | "removed";

const lozengeClasses: Record<LozengeAppearance, string> = {
  default: "bg-neutral-200 text-neutral-700",
  success: "bg-atlassian-green-light text-green-700",
  inprogress: "bg-brand-50 text-brand-800",
  new: "bg-atlassian-purple-light text-atlassian-purple",
  moved: "bg-atlassian-yellow-light text-yellow-700",
  removed: "bg-atlassian-red-light text-atlassian-red",
};

export function Lozenge({
  children,
  appearance = "default",
  isBold = false,
  className = "",
}: {
  children: React.ReactNode;
  appearance?: LozengeAppearance;
  isBold?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-atlassian px-2 py-0.5 text-[11px] uppercase tracking-wide ${
        isBold ? "font-bold" : "font-semibold"
      } ${lozengeClasses[appearance]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Badge({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "bg-neutral-200 text-neutral-700",
    primary: "bg-brand-50 text-brand-800",
    success: "bg-atlassian-green-light text-green-700",
    warning: "bg-atlassian-yellow-light text-yellow-700",
    danger: "bg-atlassian-red-light text-atlassian-red",
  };
  
  return (
    <span
      className={`inline-flex items-center rounded-atlassian px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
