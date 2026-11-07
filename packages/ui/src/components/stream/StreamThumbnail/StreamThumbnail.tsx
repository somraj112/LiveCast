import * as React from "react";
import clsx from "clsx";
import { Skeleton } from "../../ui/Skeleton/Skeleton";
export type StreamThumbnailProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "loading"
> & {
  loading?: boolean;
  rounded?: boolean;
  aspectRatio?: string;
};
export const StreamThumbnail = React.forwardRef<
  HTMLImageElement,
  StreamThumbnailProps
>(function StreamThumbnail(
  {
    className,
    src,
    alt,
    loading,
    rounded = true,
    aspectRatio = "16/9",
    ...props
  },
  ref,
) {
  return (
    <div
      className={clsx("lc-thumb", rounded && "rounded-md", className)}
      style={{ aspectRatio }}
    >
      {loading ? (
        <Skeleton className="h-full w-full" />
      ) : src ? (
        <img ref={ref} src={src} alt={alt ?? ""} {...props} />
      ) : (
        <span>Awaiting signal</span>
      )}
    </div>
  );
});
