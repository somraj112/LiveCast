import * as React from "react";
import clsx from "clsx";

export type SidebarProps = Omit<React.HTMLAttributes<HTMLElement>, "onToggle"> & {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
};

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(({ className, children, collapsed = false, onToggle, ...props }, ref) => {
  return (
    <aside
      ref={ref}
      className={clsx(
        "h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
        collapsed ? "w-20" : "w-64",
        "transition-width duration-200",
        className
      )}
      {...props}
    >
      <div className="flex h-full flex-col overflow-y-auto">{children}</div>
      <div className="p-2">
        <button
          onClick={() => onToggle?.(!collapsed)}
          aria-pressed={collapsed}
          className="w-full rounded-[8px] px-2 py-2 text-sm bg-slate-100 dark:bg-slate-800"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
    </aside>
  );
});
Sidebar.displayName = "Sidebar";

export type SidebarItemProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  icon?: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
};

export const SidebarItem = React.forwardRef<HTMLAnchorElement, SidebarItemProps>(({ className, icon, label, active = false, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
        active ? "bg-slate-100 dark:bg-slate-800 font-medium" : "",
        className
      )}
      {...props}
    >
      {icon ? <span className="inline-flex h-5 w-5 items-center justify-center">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </a>
  );
});
SidebarItem.displayName = "SidebarItem";
