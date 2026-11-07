import * as React from "react";
import clsx from "clsx";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  shadow?: boolean;
  border?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, shadow = true, border = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "lc-card",
          shadow ? "lc-card--shadow" : "",
          border ? "lc-card--border" : "",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";
