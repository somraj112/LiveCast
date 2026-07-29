import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
      success: "bg-green-100 text-green-800 dark:bg-green-900",
      danger: "bg-red-100 text-red-800 dark:bg-red-900",
      live: "bg-red-600 text-white"
    }
  },
  defaultVariants: { variant: "default" }
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, children, ...props }, ref) => {
  return (
    <span ref={ref} className={twMerge(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
});
Badge.displayName = "Badge";
