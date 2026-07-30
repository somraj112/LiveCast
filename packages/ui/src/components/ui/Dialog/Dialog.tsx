import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import clsx from "clsx";

export type DialogProps = RadixDialog.DialogProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
};

export const Dialog = ({ title, description, children, className, ...props }: DialogProps) => {
  return (
    <RadixDialog.Root {...props}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <RadixDialog.Content
          className={clsx(
            "fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-slate-900 p-6 shadow-lg focus:outline-none",
            className
          )}
          aria-describedby={description ? "dialog-description" : undefined}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? <RadixDialog.Title className="text-lg font-semibold">{title}</RadixDialog.Title> : null}
              {description ? <RadixDialog.Description id="dialog-description" className="text-sm text-slate-500">{description}</RadixDialog.Description> : null}
            </div>
            <RadixDialog.Close asChild>
              <button aria-label="Close" className="text-slate-500 hover:text-slate-700">
                <X />
              </button>
            </RadixDialog.Close>
          </div>

          <div className="mt-4">{children}</div>

          <RadixDialog.Close asChild>
            <button className="sr-only">Close</button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

Dialog.displayName = "Dialog";
