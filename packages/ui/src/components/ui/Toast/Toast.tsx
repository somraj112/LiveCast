import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import clsx from "clsx";

export type ToastProps = RadixToast.ToastProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return <RadixToast.Provider swipeDirection="right">{children}</RadixToast.Provider>;
};

export const ToastViewport = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <RadixToast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 p-4 z-50" {...props} />
);

export const Toast = ({ title, description, className, ...props }: ToastProps) => {
  return (
    <RadixToast.Root className={clsx("w-full max-w-sm rounded-[10px] bg-white dark:bg-slate-800 p-3 shadow-md", className)} {...props}>
      <div className="flex flex-col">
        {title ? <RadixToast.Title className="font-semibold">{title}</RadixToast.Title> : null}
        {description ? <RadixToast.Description className="text-sm text-slate-500">{description}</RadixToast.Description> : null}
      </div>
      <RadixToast.Close className="ml-2 text-slate-500">Close</RadixToast.Close>
    </RadixToast.Root>
  );
};

Toast.displayName = "Toast";
