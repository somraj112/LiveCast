import * as React from "react";
import { Input, type InputProps } from "../Input/Input";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

export type PasswordInputProps = Omit<InputProps, "type"> & { showToggle?: boolean };

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, showToggle = true, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={clsx("relative", className)}>
      <Input ref={ref} type={visible ? "text" : "password"} {...props} />
      {showToggle ? (
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : null}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
