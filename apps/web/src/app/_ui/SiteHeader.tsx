"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SignalMark() {
  return (
    <svg viewBox="0 0 36 32" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M3 13v6m7-13v20m7-23v26m7-21v16m7-12v8" />
      </g>
    </svg>
  );
}
export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="masthead">
      <div className="wrap mast-inner">
        <Link href="/" className="wordmark" aria-label="LiveCast home">
          <SignalMark />
          LiveCast
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["/", "Discover"],
            ["/creator", "Creator studio"],
            ["/components", "Component library"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="account-links">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="lc-button lc-button--primary">
            Join LiveCast <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
