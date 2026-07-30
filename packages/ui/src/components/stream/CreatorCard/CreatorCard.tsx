import * as React from "react";
import clsx from "clsx";
import { Avatar } from "../../ui/Avatar/Avatar";
import { Button } from "../../ui/Button/Button";
import { Skeleton } from "../../ui/Skeleton/Skeleton";

export type CreatorCardProps = React.HTMLAttributes<HTMLDivElement> & {
  username?: string;
  followers?: number;
  avatarSrc?: string;
  loading?: boolean;
  onFollow?: () => void;
  followed?: boolean;
};

export const CreatorCard = React.forwardRef<HTMLDivElement, CreatorCardProps>(({ className, username, followers = 0, avatarSrc, loading = false, onFollow, followed = false, ...props }, ref) => {
  return (
    <div ref={ref} className={clsx("flex items-center gap-3", className)} {...props}>
      {loading ? (
        <Skeleton width={40} height={40} className="rounded-full" />
      ) : (
        <Avatar src={avatarSrc} alt={username} size="md" />
      )}

      <div className="flex-1 min-w-0">
        {loading ? (
          <Skeleton width={120} height={14} />
        ) : (
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{username}</div>
        )}
        {loading ? (
          <Skeleton width={80} height={12} className="mt-1" />
        ) : (
          <div className="text-xs text-slate-500 dark:text-slate-400">{followers.toLocaleString()} followers</div>
        )}
      </div>

      <div>
        <Button size="sm" variant={followed ? "ghost" : "primary"} onClick={onFollow} aria-pressed={followed}>
          {followed ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
});
CreatorCard.displayName = "CreatorCard";
