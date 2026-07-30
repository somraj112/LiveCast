import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import clsx from "clsx";

export type SwitchProps = RadixSwitch.SwitchProps & { label?: React.ReactNode; className?: string };

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, label, ...props }, ref) => {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <RadixSwitch.Root
        ref={ref as any}
        className={clsx(
          "relative h-6 w-11 rounded-full transition-colors bg-slate-200 dark:bg-slate-700",
          props.checked ? "bg-indigo-600" : "",
          props.disabled ? "opacity-50 pointer-events-none" : "",
          className
        )}
        {...props}
      >
        <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-white shadow transform transition-transform will-change-transform" />
      </RadixSwitch.Root>
      {label ? <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span> : null}
    </label>
  );
});
Switch.displayName = "Switch";
