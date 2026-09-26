import { forwardRef } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "link" | "subtle";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-atlassian transition-all focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary:
        "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-atlassian-sm",
      secondary:
        "bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 shadow-atlassian-sm",
      danger:
        "bg-atlassian-red text-white hover:bg-red-600 active:bg-red-700 shadow-atlassian-sm",
      ghost:
        "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
      link:
        "bg-transparent text-brand-700 hover:text-brand-800 hover:underline p-0",
      subtle:
        "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
    };
    
    const sizes = {
      sm: "h-10 min-w-[44px] px-3 text-sm gap-1",
      md: "h-11 min-w-[44px] px-4 text-sm gap-1.5",
      lg: "h-12 min-w-[44px] px-5 text-base gap-2",
    };
    
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${variant !== "link" ? sizes[size] : ""} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
