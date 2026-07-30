"use client";
import React from "react";

export const ComponentSection: React.FC<React.PropsWithChildren<{ title: string; description?: string }>> = ({ title, description, children }) => {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {description ? <p className="text-sm text-slate-500 mb-4">{description}</p> : null}
      <div className="grid gap-4">{children}</div>
    </section>
  );
};

export default ComponentSection;
