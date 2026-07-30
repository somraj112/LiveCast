"use client";
import React from "react";
import clsx from "clsx";

export const ComponentPreview: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ title, children }) => {
  return (
    <div className={clsx("rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4")}> 
      {title ? <div className="text-sm font-medium mb-2">{title}</div> : null}
      <div className="">{children}</div>
    </div>
  );
};

export default ComponentPreview;
