import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: Props) {
  return (
    <div
      className="rounded-atlassian border px-6 py-10 text-center"
      style={{
        backgroundColor: "var(--neutral-surface)",
        borderColor: "var(--neutral-border)",
      }}
    >
      <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      <Link href={actionHref}>
        <Button type="button" className="min-h-[44px]">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
