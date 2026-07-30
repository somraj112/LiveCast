import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import clsx from "clsx";

export type RadioGroupProps = RadixRadio.RadioGroupProps & { children?: React.ReactNode; className?: string };
export type RadioItemProps = RadixRadio.RadioGroupItemProps & { label?: React.ReactNode; className?: string };

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(({ className, children, ...props }, ref) => (
  <RadixRadio.Root ref={ref} className={clsx("flex flex-col gap-2", className)} {...props}>
    {children}
  </RadixRadio.Root>
));
RadioGroup.displayName = "RadioGroup";

export const RadioItem = React.forwardRef<HTMLInputElement, RadioItemProps>(({ className, label, ...props }, ref) => (
  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
    <RadixRadio.Item
      ref={ref as any}
      className={clsx(
        "h-5 w-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center",
        props.disabled ? "opacity-50 pointer-events-none" : "",
        className
      )}
      {...props}
    >
      <RadixRadio.Indicator className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
    </RadixRadio.Item>
    {label ? <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span> : null}
  </label>
));
RadioItem.displayName = "RadioItem";
