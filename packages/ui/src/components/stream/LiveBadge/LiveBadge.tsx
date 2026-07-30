import * as React from "react";
import clsx from "clsx";

export type LiveBadgeVariant = "live" | "offline" | "ended";

export type LiveBadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: LiveBadgeVariant };

export const LiveBadge = React.forwardRef<HTMLSpanElement, LiveBadgeProps>(({ className, variant = "live", children, ...props }, ref) => {
  const base = "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-semibold";

  const variantClasses = {
    live: "bg-red-600 text-white",
    offline: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    ended: "bg-amber-500 text-white"
  } as const;

  return (
    <span ref={ref} className={clsx(base, variantClasses[variant], className)} {...props}>
      {children ?? (variant === "live" ? "LIVE" : variant === "offline" ? "OFFLINE" : "ENDED")}
    </span>
  );
});
LiveBadge.displayName = "LiveBadge";
