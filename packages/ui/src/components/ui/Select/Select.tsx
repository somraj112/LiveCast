import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

export type SelectProps = React.ComponentProps<typeof RadixSelect.Root> & {
  className?: string;
  placeholder?: string;
};

export const Select = ({
  className,
  children,
  placeholder,
  ...props
}: SelectProps) => {
  return (
    <RadixSelect.Root {...props}>
      <RadixSelect.Trigger asChild>
        <button
          className={clsx(
            "inline-flex items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-sm w-full",
            "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
            className,
          )}
          aria-label={placeholder}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4" />
          </RadixSelect.Icon>
        </button>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 overflow-hidden rounded-[8px] border bg-white dark:bg-slate-900 shadow-md">
          <RadixSelect.Viewport className="p-1">
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RadixSelect.Item>
>(({ children, className, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref as any}
    className={clsx(
      "relative flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
      className,
    )}
    {...props}
  >
    <RadixSelect.ItemIndicator className="absolute left-2">
      <Check className="h-4 w-4 text-orange-800" />
    </RadixSelect.ItemIndicator>
    <RadixSelect.ItemText className="pl-6">{children}</RadixSelect.ItemText>
  </RadixSelect.Item>
));
SelectItem.displayName = "SelectItem";

Select.displayName = "Select";
