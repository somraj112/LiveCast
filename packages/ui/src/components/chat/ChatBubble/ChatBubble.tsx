import * as React from "react";
import clsx from "clsx";

export type ChatBubbleProps = React.HTMLAttributes<HTMLDivElement> & {
  author?: string;
  role?: "me" | "other" | "system";
  timestamp?: string | Date;
  children?: React.ReactNode;
};

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(({ className, author, role = "other", timestamp, children, ...props }, ref) => {
  const isMe = role === "me";
  const base = "inline-block max-w-full rounded-lg p-3 text-sm";
  const variant = isMe ? "bg-indigo-600 text-white" : role === "system" ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100";

  return (
    <div ref={ref} className={clsx("flex items-start gap-3", className)} {...props}>
      {/* avatar slot is handled by ChatMessage; bubble itself focuses on content */}
      <div className={clsx(base, variant)}>
        <div className="whitespace-pre-wrap">{children}</div>
        {timestamp ? (
          <div className={clsx("mt-2 text-xs opacity-70", isMe ? "text-indigo-100" : "text-slate-500 dark:text-slate-400")}>{typeof timestamp === "string" ? timestamp : new Date(timestamp).toLocaleTimeString()}</div>
        ) : null}
      </div>
    </div>
  );
});
ChatBubble.displayName = "ChatBubble";
