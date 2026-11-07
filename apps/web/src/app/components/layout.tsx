import type { ReactNode } from "react";
export const metadata = { title: "Component library" };
export default function ComponentLibraryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
