import * as React from "react";
import clsx from "clsx";

export type AvatarProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  size?: "xs" | "sm" | "md" | "lg";
  fallback?: string; // initials
};

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base"
};

export const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(({ className, src, alt, size = "md", fallback, ...props }, ref) => {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx("inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 overflow-hidden", sizeMap[size], className)}
        {...props}
      >
        <span className="select-none">{fallback ?? alt?.slice(0,2)?.toUpperCase() ?? "?"}</span>
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={clsx("rounded-full object-cover", sizeMap[size], className)}
      {...props}
    />
  );
});
Avatar.displayName = "Avatar";
