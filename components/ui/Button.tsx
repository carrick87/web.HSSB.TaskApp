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
        "bg-neutral-200 text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400",
      danger:
        "bg-atlassian-red text-white hover:bg-red-600 active:bg-red-700 shadow-atlassian-sm",
      ghost:
        "bg-transparent text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300",
      link:
        "bg-transparent text-brand-700 hover:text-brand-800 hover:underline p-0",
      subtle:
        "bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200",
    };
    
    const sizes = {
      sm: "h-8 px-3 text-xs gap-1",
      md: "h-9 px-4 text-sm gap-1.5",
      lg: "h-10 px-5 text-sm gap-2",
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
