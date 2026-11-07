import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import clsx from "clsx";

export type SwitchProps = RadixSwitch.SwitchProps & {
  label?: React.ReactNode;
  className?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-3 cursor-pointer select-none">
        <RadixSwitch.Root
          ref={ref}
          className={clsx(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-stone-300 data-[state=checked]:bg-stone-900",
            props.disabled ? "opacity-50 pointer-events-none" : "",
            className,
          )}
          {...props}
        >
          <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 data-[state=checked]:translate-x-[22px] rounded-full bg-white shadow transform transition-transform will-change-transform" />
        </RadixSwitch.Root>
        {label ? (
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {label}
          </span>
        ) : null}
      </label>
    );
  },
);
Switch.displayName = "Switch";
