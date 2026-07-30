"use client";
import React from "react";
import { ChatMessage, ChatInput } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const ChatShowcase = () => {
  const [messages, setMessages] = React.useState<any[]>([
    { id: 1, author: "Alice", text: "Hello everyone!" },
    { id: 2, author: "Bob", text: "Hi Alice" },
  ]);

  return (
    <ComponentPreview title="Chat">
      <div className="flex flex-col gap-3">
        <div className="space-y-2 max-h-48 overflow-auto p-2 border border-slate-100 dark:border-slate-800 rounded">
          {messages.map((m) => (
            <ChatMessage key={m.id} id={m.id} author={m.author} avatarSrc="/avatar.jpg">
              {m.text}
            </ChatMessage>
          ))}
        </div>

        <ChatInput
          onSend={(value) => setMessages((s) => [...s, { id: Date.now(), author: "You", text: value }])}
        />
      </div>
    </ComponentPreview>
  );
};

export default ChatShowcase;
