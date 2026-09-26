"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCT_NAME } from "@/src/config/product";

const steps = [
  { id: "account", label: "Account", href: "/login?mode=signup&redirect=/onboarding/workspace" },
  { id: "workspace", label: "Workspace", href: "/onboarding/workspace" },
  { id: "invite", label: "Invite team", href: "/onboarding/invite" },
];

export function OnboardingSteps() {
  const pathname = usePathname();
  const activeIndex = pathname.includes("/invite")
    ? 2
    : pathname.includes("/workspace") || pathname.includes("/create-org")
      ? 1
      : 0;

  return (
    <ol className="flex gap-2 justify-center mb-8 text-xs">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold"
              style={{
                backgroundColor: done || active ? "var(--brand-primary)" : "var(--neutral-border)",
                color: done || active ? "var(--text-inverse)" : "var(--text-secondary)",
              }}
            >
              {index + 1}
            </span>
            <span style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{step.label}</span>
            {index < steps.length - 1 && (
              <span className="w-6 h-px" style={{ backgroundColor: "var(--neutral-border)" }} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--neutral-bg)" }}>
      <div className="w-full max-w-lg">
        <OnboardingSteps />
        {children}
        <p className="mt-8 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          <Link href="/" className="text-brand-700 hover:underline">
            Back to {PRODUCT_NAME}
          </Link>
        </p>
      </div>
    </main>
  );
}
