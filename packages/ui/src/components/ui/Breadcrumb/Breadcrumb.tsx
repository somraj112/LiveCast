import * as React from "react";
import clsx from "clsx";

export type Crumb = { label: React.ReactNode; href?: string };

export type BreadcrumbProps = React.HTMLAttributes<nav> & {
  items?: Crumb[];
};

export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(({ items = [], className, ...props }, ref) => {
  if (items.length === 0) return null;

  return (
    <nav ref={ref} aria-label="Breadcrumb" className={clsx("text-sm", className)} {...props}>
      <ol className="inline-flex items-center gap-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="inline-flex items-center">
              {item.href && !isLast ? (
                <a href={item.href} className="text-slate-600 dark:text-slate-300 hover:underline">
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-600 dark:text-slate-300"}>{item.label}</span>
              )}

              {!isLast ? (
                <svg className="mx-2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
Breadcrumb.displayName = "Breadcrumb";
