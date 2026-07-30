import * as React from "react";
import * as RadixAlert from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import clsx from "clsx";

export type AlertDialogProps = RadixAlert.AlertDialogProps & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
};

export const AlertDialog = ({ title, description, confirmText = "Confirm", cancelText = "Cancel", onConfirm, children, ...props }: AlertDialogProps) => {
  return (
    <RadixAlert.Root {...props}>
      <RadixAlert.Portal>
        <RadixAlert.Overlay className="fixed inset-0 bg-black/40" />
        <RadixAlert.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-slate-900 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              {title ? <RadixAlert.Title className="text-lg font-semibold">{title}</RadixAlert.Title> : null}
              {description ? <RadixAlert.Description className="text-sm text-slate-500">{description}</RadixAlert.Description> : null}
            </div>
            <RadixAlert.Cancel className="text-slate-500 hover:text-slate-700">
              <X />
            </RadixAlert.Cancel>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <RadixAlert.Cancel className="rounded-[8px] px-3 py-2 bg-slate-100 dark:bg-slate-800">{cancelText}</RadixAlert.Cancel>
            <RadixAlert.Action asChild>
              <button onClick={onConfirm} className="rounded-[8px] px-3 py-2 bg-red-600 text-white">{confirmText}</button>
            </RadixAlert.Action>
          </div>
        </RadixAlert.Content>
      </RadixAlert.Portal>
    </RadixAlert.Root>
  );
};

AlertDialog.displayName = "AlertDialog";
