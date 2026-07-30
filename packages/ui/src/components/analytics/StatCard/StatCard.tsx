import * as React from "react";
import clsx from "clsx";
import { ArrowUp, ArrowDown } from "lucide-react";

export type StatCardProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  delta?: number; // percentage change
  description?: string;
  icon?: React.ReactNode;
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(({ className, label, value, delta, description, icon, ...props }, ref) => {
  const showDelta = typeof delta === "number";
  const positive = (delta ?? 0) >= 0;

  return (
    <div ref={ref} className={clsx("rounded-[12px] bg-white dark:bg-slate-900 p-4 shadow-sm", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
        </div>
        {icon ? <div className="text-slate-500 dark:text-slate-300">{icon}</div> : null}
      </div>

      {showDelta ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", positive ? "bg-green-100 text-green-700 dark:bg-green-900" : "bg-red-100 text-red-700 dark:bg-red-900")}>{positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(delta)}%</span>
          {description ? <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span> : null}
        </div>
      ) : null}
    </div>
  );
});
StatCard.displayName = "StatCard";
