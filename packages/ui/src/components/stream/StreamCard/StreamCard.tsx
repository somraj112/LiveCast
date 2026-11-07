import * as React from "react";
import clsx from "clsx";
import { LiveBadge } from "../LiveBadge/LiveBadge";
import { StreamThumbnail } from "../StreamThumbnail/StreamThumbnail";
import { ViewerCount } from "../ViewerCount/ViewerCount";
import { Avatar } from "../../ui/Avatar/Avatar";
import { Skeleton } from "../../ui/Skeleton/Skeleton";

export type StreamCardVariant = "compact" | "default" | "detailed";
export type StreamCardProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick"
> & {
  title?: string;
  category?: string;
  thumbnail?: string;
  creatorName?: string;
  creatorAvatar?: string;
  viewers?: number;
  isLive?: boolean;
  loading?: boolean;
  variant?: StreamCardVariant;
  onClick?: () => void;
};

export const StreamCard = React.forwardRef<HTMLDivElement, StreamCardProps>(
  function StreamCard(
    {
      title,
      category,
      thumbnail,
      creatorName,
      creatorAvatar,
      viewers = 0,
      isLive,
      loading,
      variant = "default",
      onClick,
      className,
      ...props
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={clsx("lc-stream", "lc-stream--" + variant, className)}
        {...props}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </>
        ) : (
          <>
            <div className="lc-stream-art">
              <StreamThumbnail src={thumbnail} alt="" rounded={false} />
              <div className="lc-stream-flags">
                <LiveBadge variant={isLive ? "live" : "offline"} />
                <ViewerCount count={viewers} />
              </div>
            </div>
            <div className="lc-stream-info">
              {category && <span className="lc-category">{category}</span>}
              <h3>
                {onClick ? (
                  <button
                    type="button"
                    className="lc-stream-open"
                    onClick={onClick}
                  >
                    {title}
                  </button>
                ) : (
                  title
                )}
              </h3>
              {creatorName && (
                <div className="lc-byline">
                  <Avatar size="xs" src={creatorAvatar} alt={creatorName} />
                  <span>{creatorName}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  },
);
