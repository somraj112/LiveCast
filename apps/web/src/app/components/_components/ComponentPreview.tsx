import type { PropsWithChildren } from "react";
export default function ComponentPreview({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <section className="specimen">
      {title && <h3 className="spec-label">{title}</h3>}
      <div className="spec-body">{children}</div>
    </section>
  );
}
