import * as React from "react";
import clsx from "clsx";
import { Skeleton } from "../../ui/Skeleton/Skeleton";

export type StreamListSkeletonProps = {
  count?: number;
  variant?: "grid" | "list";
  className?: string;
};

export const StreamListSkeleton: React.FC<StreamListSkeletonProps> = ({ count = 6, variant = "grid", className }) => {
  const items = Array.from({ length: count }).map((_, i) => i);

  if (variant === "list") {
    return (
      <div className={clsx("flex flex-col gap-4", className)}>
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton width={160} height={90} className="rounded-[8px] flex-shrink-0" />
            <div className="flex-1">
              <Skeleton width={140} height={16} />
              <div className="mt-2 flex items-center gap-2">
                <Skeleton width={32} height={32} className="rounded-full" />
                <Skeleton width={120} height={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // grid
  return (
    <div className={clsx("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {items.map((i) => (
        <div key={i}>
          <Skeleton className="w-full h-44 rounded-[10px]" />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton width={36} height={36} className="rounded-full" />
              <Skeleton width={140} height={12} />
            </div>
            <Skeleton width={60} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

StreamListSkeleton.displayName = "StreamListSkeleton";
