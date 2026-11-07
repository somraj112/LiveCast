import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import clsx from "clsx";

export const Tabs = RadixTabs.Root;
export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={clsx("flex gap-1 bg-transparent", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof RadixTabs.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixTabs.Trigger asChild {...props}>
    <button
      ref={ref}
      className={clsx(
        "px-3 py-2 rounded text-sm font-semibold text-stone-700 hover:bg-stone-100 data-[state=active]:bg-stone-900 data-[state=active]:text-white",
        className,
      )}
    >
      {children}
    </button>
  </RadixTabs.Trigger>
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content ref={ref} className={clsx("mt-3", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
