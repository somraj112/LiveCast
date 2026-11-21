"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@streamline/ui";
import { refreshSession } from "@/lib/auth";
import { BroadcastPlayer } from "@/app/_ui/BroadcastPlayer";

type Message = { id: string; streamId: string; senderId: string; message: string; sentAt: string; deleted: boolean; sender: { username: string } };
type Ban = { userId: string; reason: string | null; user: { username: string } };
type Joined = { messages: Message[]; count: number; canModerate: boolean; userId: string; bans: Ban[] };
type Reply<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3001");

export default function StreamRoom() {
  const { streamId } = useParams<{ streamId: string }>();
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [count, setCount] = useState(0);
  const [canModerate, setCanModerate] = useState(false);
  const [userId, setUserId] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const socket = io(socketUrl, {
      autoConnect: false,
      auth: async (callback) => {
        try {
          const session = await refreshSession();
          if (active) callback({ token: session.accessToken });
        } catch {
          if (active) setError("Log in to join the live conversation.");
        }
      },
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.timeout(8000).emit("stream:join", { streamId }, (timeout: Error | null, reply: Reply<Joined>) => {
        if (!active) return;
        if (timeout || !reply) {
          setError("The stream did not respond. Try reconnecting.");
          return;
        }
        if (!reply.success) {
          setError(reply.error.message);
          return;
        }
        setMessages(reply.data.messages);
        setBans(reply.data.bans);
        setCount(reply.data.count);
        setCanModerate(reply.data.canModerate);
        setUserId(reply.data.userId);
        setConnected(true);
        setError("");
      });
    });
    socket.on("chat:message", (message: Message) => {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100));
    });
    socket.on("chat:deleted", ({ messageId }: { messageId: string }) => {
      setMessages((current) => current.filter((item) => item.id !== messageId));
    });
    socket.on("stream:viewers", ({ count: next }: { count: number }) => setCount(next));
    socket.on("stream:banned", () => { setConnected(false); setCount(0); setError("You have been banned from this stream."); });
    socket.on("stream:status", ({ status }: { status: string }) => {
      if (status === "ENDED") { setConnected(false); setCount(0); setError("The broadcast has ended. You can watch its recording when it is ready."); }
    });
    socket.on("moderation:banned", (ban: Ban) => setBans((current) => [...current.filter((item) => item.userId !== ban.userId), ban]));
    socket.on("moderation:unbanned", ({ userId: id }: { userId: string }) => setBans((current) => current.filter((item) => item.userId !== id)));
    socket.on("disconnect", (reason) => {
      setConnected(false);
      setCount(0);
      if (active && reason === "io server disconnect") socket.connect();
    });
    socket.on("connect_error", (cause: Error) => { if (active) setError(cause.message); });
    socket.connect();
    return () => {
      active = false;
      socket.emit("stream:leave", { streamId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!socketRef.current || !connected || !draft.trim() || sending) return;
    setSending(true);
    try {
      const reply: Reply<unknown> = await socketRef.current.timeout(8000).emitWithAck("chat:send", { streamId, message: draft.trim() });
      if (!reply.success) setError(reply.error.message);
      else { setDraft(""); setError(""); }
    } catch { setError("Message delivery was not confirmed. Check the conversation before retrying."); }
    finally { setSending(false); }
  }

  async function moderate(event: string, input: Record<string, string>) {
    if (!connected || !socketRef.current) return;
    try {
      const reply: Reply<unknown> = await socketRef.current.timeout(8000).emitWithAck(event, { streamId, ...input });
      setError(reply.success ? "" : reply.error.message);
    } catch { setError("The moderation action was not confirmed. Try again."); }
  }

  return (
    <main id="content" className="wrap live-room">
      <header className="lineup-head">
        <div><span className="eyebrow"><span className="signal-dot" /> Live conversation</span><h1>In the room.</h1></div>
        <Link href="/">Leave stream →</Link>
      </header>
      <BroadcastPlayer streamId={streamId} />
      <p aria-live="polite">{connected ? "Connected" : "Disconnected"} · {count} {count === 1 ? "viewer" : "viewers"}</p>
      {error ? <p className="dashboard-alert" role="alert">{error} <Link href="/login">Log in</Link></p> : null}
      {!connected ? <Button onClick={() => { socketRef.current?.disconnect(); socketRef.current?.connect(); }}>Reconnect</Button> : null}
      <section className="live-chat" aria-label="Stream chat">
        <ol className="live-messages" aria-live="polite" aria-relevant="additions removals">
          {messages.map((message) => <li key={message.id}>
            <div><strong>{message.sender.username}</strong> <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString()}</time></div>
            <p>{message.message}</p>
            {canModerate ? <div className="moderation-actions">
              <button onClick={() => void moderate("chat:delete", { messageId: message.id })}>Delete message</button>
              {message.senderId !== userId ? <button onClick={() => void moderate("moderation:ban", { userId: message.senderId })}>Ban {message.sender.username}</button> : null}
            </div> : null}
          </li>)}
        </ol>
        <form onSubmit={send} className="live-composer">
          <label htmlFor="chat-message">Your message</label>
          <textarea id="chat-message" value={draft} maxLength={2000} required disabled={!connected} onChange={(event) => setDraft(event.target.value)} />
          <Button type="submit" disabled={!connected || !draft.trim()} loading={sending}>Send message</Button>
        </form>
      </section>
      {canModerate ? <section className="live-bans" aria-label="Banned viewers"><h2>Banned viewers</h2>
        {!bans.length ? <p>No banned viewers.</p> : <ul>{bans.map((ban) => <li key={ban.userId}>{ban.user.username} {ban.reason ? `— ${ban.reason}` : ""} <Button variant="ghost" onClick={() => void moderate("moderation:unban", { userId: ban.userId })}>Unban</Button></li>)}</ul>}
      </section> : null}
    </main>
  );
}
