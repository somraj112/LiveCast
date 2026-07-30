import * as React from "react";
import clsx from "clsx";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({ className, rounded = true, width = "100%", height = 16, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={clsx(
        "bg-slate-100 dark:bg-slate-800 animate-pulse",
        rounded ? "rounded-[8px]" : "",
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";
