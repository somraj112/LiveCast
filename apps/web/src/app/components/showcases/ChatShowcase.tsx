"use client";
import { useState } from "react";
import { ChatInput, ChatMessage } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";
export default function ChatShowcase() {
  const [messages, setMessages] = useState([
    { id: "1", author: "Mira", text: "Welcome to the listening room." },
    { id: "2", author: "Ari", text: "Love the opening track!" },
  ]);
  return (
    <ComponentPreview title="Studio chat">
      <div
        role="log"
        aria-label="Demo chat"
        className="max-h-72 overflow-y-auto space-y-3 pb-4"
      >
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            id={m.id}
            author={m.author}
            role={m.author === "You" ? "me" : "other"}
          >
            {m.text}
          </ChatMessage>
        ))}
      </div>
      <ChatInput
        placeholder="Write a message…"
        onSend={(text) =>
          setMessages((list) => [
            ...list,
            { id: String(list.length + 1), author: "You", text },
          ])
        }
      />
    </ComponentPreview>
  );
}
