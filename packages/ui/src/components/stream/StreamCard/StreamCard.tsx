import * as React from "react";
import clsx from "clsx";
import { Card } from "../../ui/Card/Card";
import { StreamThumbnail } from "../StreamThumbnail/StreamThumbnail";
import { LiveBadge } from "../LiveBadge/LiveBadge";
import { ViewerCount } from "../ViewerCount/ViewerCount";
import { Avatar } from "../../ui/Avatar/Avatar";
import { Badge } from "../../ui/Badge/Badge";
import { Skeleton } from "../../ui/Skeleton/Skeleton";

export type StreamCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  category?: string;
  thumbnail?: string;
  creatorName?: string;
  creatorAvatar?: string;
  viewers?: number;
  isLive?: boolean;
  loading?: boolean;
  onClick?: () => void;
};

export const StreamCard = React.forwardRef<HTMLDivElement, StreamCardProps>(({ className, title, category, thumbnail, creatorName, creatorAvatar, viewers = 0, isLive = false, loading = false, onClick, ...props }, ref) => {
  return (
    <Card ref={ref} className={clsx("overflow-hidden", className)} onClick={onClick} role="button" tabIndex={0} {...props}>
      <div className="relative">
        {loading ? (
          <div className="w-full h-48"><Skeleton className="w-full h-full rounded-[10px]" /></div>
        ) : (
          <StreamThumbnail src={thumbnail} alt={title} />
        )}

        <div className="absolute left-3 top-3">
          <LiveBadge variant={isLive ? "live" : "offline"} />
        </div>

        <div className="absolute right-3 top-3">
          <ViewerCount count={viewers} />
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {loading ? (
              <Skeleton width={36} height={36} className="rounded-full" />
            ) : (
              <Avatar src={creatorAvatar} alt={creatorName} size="sm" />
            )}

            <div className="min-w-0">
              {loading ? (
                <Skeleton width={140} height={14} />
              ) : (
                <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{title}</div>
              )}

              {loading ? (
                <Skeleton width={80} height={12} className="mt-1" />
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">{category ? <Badge variant="default">{category}</Badge> : null}</div>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center">
            {/* Placeholder for menu or actions */}
          </div>
        </div>
      </div>
    </Card>
  );
});
StreamCard.displayName = "StreamCard";
