import * as React from "react";
import clsx from "clsx";
import { Eye } from "lucide-react";

export type ViewerCountProps = React.HTMLAttributes<HTMLDivElement> & { count: number };

const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

export const ViewerCount = React.forwardRef<HTMLDivElement, ViewerCountProps>(({ className, count, ...props }, ref) => {
  return (
    <div ref={ref} className={clsx("inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200", className)} {...props}>
      <Eye className="h-4 w-4 text-slate-500" aria-hidden />
      <span aria-live="polite" aria-atomic>{formatCount(count)} watching</span>
    </div>
  );
});
ViewerCount.displayName = "ViewerCount";
