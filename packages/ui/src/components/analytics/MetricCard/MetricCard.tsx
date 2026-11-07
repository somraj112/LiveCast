import * as React from "react";
import clsx from "clsx";

export type MetricCardProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  metric: string | number;
  meta?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
};

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, metric, meta, trend = "flat", icon, ...props }, ref) => {
    const trendColor =
      trend === "up"
        ? "text-green-600"
        : trend === "down"
          ? "text-red-600"
          : "text-slate-500";

    return (
      <div ref={ref} className={clsx("lc-metric", className)} {...props}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="lc-category">{label}</div>
            <div className="lc-metric-value">{metric}</div>
            {meta ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {meta}
              </div>
            ) : null}
          </div>
          {icon ? (
            <div className={clsx("rounded p-2 bg-slate-100 dark:bg-slate-800")}>
              {icon}
            </div>
          ) : null}
        </div>
        <div className={clsx("mt-2 text-sm", trendColor)}>
          {trend === "up"
            ? "↗ Rising"
            : trend === "down"
              ? "↘ Falling"
              : "Steady"}
          {/* additional trend text could go here */}
        </div>
      </div>
    );
  },
);
MetricCard.displayName = "MetricCard";
