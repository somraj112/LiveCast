import * as React from "react";
import clsx from "clsx";
import { Skeleton } from "../../ui/Skeleton/Skeleton";

export type StreamThumbnailProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  loading?: boolean;
  rounded?: boolean;
  aspectRatio?: string; // e.g., "16/9" used for padding-top via CSS if needed
};

export const StreamThumbnail = React.forwardRef<HTMLImageElement, StreamThumbnailProps>(({ className, src, alt, loading = false, rounded = true, ...props }, ref) => {
  const base = "relative overflow-hidden bg-slate-100 dark:bg-slate-800";
  const radius = rounded ? "rounded-[10px]" : "";

  return (
    <div className={clsx(base, radius, className)}>
      {loading ? (
        <div className="aspect-video">
          <Skeleton className="w-full h-full" />
        </div>
      ) : (
        <img
          ref={ref}
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-200 ease-out hover:scale-105"
          {...props}
        />
      )}
    </div>
  );
});
StreamThumbnail.displayName = "StreamThumbnail";
