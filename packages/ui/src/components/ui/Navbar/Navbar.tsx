import * as React from "react";
import clsx from "clsx";
import { Avatar } from "../Avatar/Avatar";
import { Button } from "../Button/Button";

export type NavbarProps = React.HTMLAttributes<HTMLElement> & {
  brand?: React.ReactNode;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  sticky?: boolean;
};

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    {
      brand,
      leftSlot,
      rightSlot,
      className,
      sticky = true,
      children,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    return (
      <header
        ref={ref}
        className={clsx(
          "w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
          sticky ? "sticky top-0 z-40" : "",
          className,
        )}
        {...props}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {brand ?? (
                  <span className="text-lg font-semibold">LiveCast</span>
                )}
              </div>
              <div className="hidden sm:block">{leftSlot}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">{rightSlot}</div>

              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  aria-label={open ? "Close menu" : "Open menu"}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <Avatar size="sm" alt="Profile" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {open ? (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-4 py-3">{children}</div>
          </div>
        ) : null}
      </header>
    );
  },
);
Navbar.displayName = "Navbar";
