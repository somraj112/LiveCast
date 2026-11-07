import * as React from "react";
import clsx from "clsx";
export type LiveBadgeVariant = "live" | "offline" | "ended";
export type LiveBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: LiveBadgeVariant;
};
export const LiveBadge = React.forwardRef<HTMLSpanElement, LiveBadgeProps>(
  function LiveBadge({ className, variant = "live", children, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={clsx("lc-status", "lc-status--" + variant, className)}
        {...props}
      >
        <i aria-hidden="true" />
        {children ?? variant}
      </span>
    );
  },
);
