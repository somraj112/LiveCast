import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const inputVariants = cva(
  "w-full rounded-[12px] border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-200 dark:border-slate-700",
        subtle: "border-transparent"
      },
      size: {
        sm: "h-8",
        default: "h-10",
        lg: "h-12"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, variant, size, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={twMerge(inputVariants({ variant, size }), className)}
      {...props}
    />
  );
});
Input.displayName = "Input";
