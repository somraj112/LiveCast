import * as React from "react";

export type SpinnerProps = React.SVGProps<SVGSVGElement> & { size?: number; variant?: "default" | "muted" };

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(({ className, size = 16, variant = "default", ...props }, ref) => {
  const colorClass = variant === "muted" ? "text-slate-400" : "text-indigo-500";

  return (
    <svg
      ref={ref}
      className={`${colorClass} ${className ?? ""} "` + ""}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Loading"
      {...props}
    >
      <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" strokeWidth="4" stroke="currentColor" strokeLinecap="round" className="animate-spin-origin" />
    </svg>
  );
});
Spinner.displayName = "Spinner";
