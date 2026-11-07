import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import clsx from "clsx";

export type CheckboxProps = RadixCheckbox.CheckboxProps & {
  label?: React.ReactNode;
  className?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <RadixCheckbox.Root
          {...props}
          ref={ref as any}
          className={clsx(
            "inline-flex h-5 w-5 items-center justify-center rounded-md border bg-white dark:bg-slate-900",
            "border-slate-200 dark:border-slate-700",
            props.disabled ? "opacity-50 pointer-events-none" : "",
            className,
          )}
        >
          <RadixCheckbox.Indicator>
            <Check className="h-4 w-4 text-orange-800" />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        {label ? (
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {label}
          </span>
        ) : null}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
