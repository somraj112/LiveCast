import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const badgeVariants = cva("lc-badge", {
  variants: {
    variant: {
      default: "lc-badge--default",
      success: "lc-badge--success",
      danger: "lc-badge--danger",
      live: "lc-badge--live",
    },
  },
  defaultVariants: { variant: "default" },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(badgeVariants({ variant }), className)}
        {...props}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";
