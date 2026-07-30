import * as React from "react";
import clsx from "clsx";
import { Input } from "../../ui/Input/Input";
import { Button } from "../../ui/Button/Button";
import { Send } from "lucide-react";

export type ChatInputProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export const ChatInput = React.forwardRef<HTMLInputElement, ChatInputProps>(({ value = "", placeholder = "Message", onChange, onSend, disabled = false, loading = false, className }, ref) => {
  const [val, setVal] = React.useState(value);

  React.useEffect(() => setVal(value), [value]);

  const handleSend = () => {
    if (!val.trim()) return;
    onSend?.(val.trim());
    setVal("");
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Input
        ref={ref}
        value={val}
        onChange={(e) => { setVal(e.target.value); onChange?.(e.target.value); }}
        placeholder={placeholder}
        disabled={disabled || loading}
        aria-label={placeholder}
        onKeyDown={onKeyDown}
      />
      <Button variant="primary" size="sm" onClick={handleSend} disabled={disabled || loading} aria-label="Send message">
        {loading ? "Sending" : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
});
ChatInput.displayName = "ChatInput";
