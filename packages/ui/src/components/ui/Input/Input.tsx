import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const inputVariants = cva("lc-input", {
  variants: {
    variant: {
      default: "lc-input--default",
      subtle: "lc-input--subtle",
    },
    size: {
      sm: "h-8",
      default: "h-10",
      lg: "h-12",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> &
  VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={twMerge(inputVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
