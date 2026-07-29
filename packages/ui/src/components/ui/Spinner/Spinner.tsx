import * as React from "react";

export type SpinnerProps = React.SVGProps<SVGSVGElement> & { size?: number };

export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(({ className, size = 16, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" strokeWidth="4" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
});
Spinner.displayName = "Spinner";
