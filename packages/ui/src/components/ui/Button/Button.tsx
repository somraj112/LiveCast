import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import { Spinner } from "../Spinner/Spinner";

const buttonVariants = cva("lc-button", {
  variants: {
    variant: {
      primary: "lc-button--primary",
      ghost: "lc-button--ghost",
      secondary: "lc-button--secondary",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      default: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    icon?: React.ReactNode;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      children,
      loading = false,
      disabled,
      icon,
      ...props
    },
    ref,
  ) => {
    const merged = twMerge(buttonVariants({ variant, size }), className);

    return (
      <button
        ref={ref}
        className={clsx(merged, "inline-flex items-center")}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-flex" aria-hidden>
            <Spinner size={16} className="animate-spin" />
          </span>
        ) : null}

        {icon ? (
          <span className={clsx(children ? "mr-2" : "")}>{icon}</span>
        ) : null}

        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
