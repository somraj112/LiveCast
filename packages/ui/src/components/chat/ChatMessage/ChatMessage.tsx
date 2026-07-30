import * as React from "react";
import clsx from "clsx";
import { Avatar } from "../../ui/Avatar/Avatar";
import { ChatBubble } from "../ChatBubble/ChatBubble";

export type ChatMessageProps = React.HTMLAttributes<HTMLElement> & {
  id?: string | number;
  author?: string;
  avatarSrc?: string;
  role?: "me" | "other" | "system";
  timestamp?: string | Date;
  children?: React.ReactNode;
};

export const ChatMessage = React.forwardRef<HTMLElement, ChatMessageProps>(({ className, id, author, avatarSrc, role = "other", timestamp, children, ...props }, ref) => {
  const isMe = role === "me";

  return (
    <article ref={ref} aria-describedby={id ? `msg-${id}` : undefined} className={clsx("flex gap-3 items-start", isMe ? "justify-end" : "justify-start", className)} {...props}>
      {!isMe ? <Avatar src={avatarSrc} alt={author} size="sm" /> : null}

      <div id={id ? `msg-${id}` : undefined} className="max-w-[80%]">
        {author && !isMe ? <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{author}</div> : null}
        <ChatBubble role={role} timestamp={timestamp}>{children}</ChatBubble>
      </div>

      {isMe ? <Avatar src={avatarSrc} alt={author} size="sm" /> : null}
    </article>
  );
});
ChatMessage.displayName = "ChatMessage";
