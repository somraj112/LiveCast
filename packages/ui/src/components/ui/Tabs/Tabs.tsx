import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import clsx from "clsx";

export const Tabs = RadixTabs.Root;
export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof RadixTabs.List>>(({ className, ...props }, ref) => (
  <RadixTabs.List ref={ref} className={clsx("flex gap-1 bg-transparent", className)} {...props} />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof RadixTabs.Trigger>>(({ className, children, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={clsx(
      "px-3 py-2 rounded-[8px] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
      className
    )}
    {...props}
  >
    {children}
  </RadixTabs.Trigger>
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof RadixTabs.Content>>(({ className, ...props }, ref) => (
  <RadixTabs.Content ref={ref} className={clsx("mt-3", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
