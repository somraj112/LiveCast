import * as React from "react";
import clsx from "clsx";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  shadow?: boolean;
  border?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, shadow = true, border = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        "rounded-[12px] bg-white dark:bg-slate-900",
        shadow ? "shadow-sm" : "",
        border ? "border border-slate-200 dark:border-slate-700" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = "Card";
