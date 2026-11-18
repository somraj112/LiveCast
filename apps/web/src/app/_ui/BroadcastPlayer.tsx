"use client";

import { useEffect, useRef, useState } from "react";
import { authenticatedRequest } from "@/lib/auth";

type Playback = {
  title: string;
  status: string;
  source: { url: string; expiresAt: number; kind: "live" | "recording" } | null;
  recording: { id: string; duration: number; createdAt: string } | null;
};

export function BroadcastPlayer({ streamId }: { streamId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [source, setSource] = useState<Playback["source"]>(null);
  const [error, setError] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await authenticatedRequest<Playback>(`/streams/${streamId}/playback`);
        if (!active) return;
        setPlayback(next);
        setError("");
        // Status polls must not restart playback. Renew a URL only when its media changes or expiry approaches.
        setSource((current) => current && next.source
          && current.url.split("?")[0] === next.source.url.split("?")[0]
          && current.expiresAt > Date.now() / 1000 + 120
          ? current : next.source);
      } catch (cause) {
        if (active) { setSource(null); setError(cause instanceof Error ? cause.message : "Playback is unavailable."); }
      } finally {
        if (active) timer = setTimeout(() => void refresh(), 10000);
      }
    }
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [streamId]);

  useEffect(() => {
    const element = video.current;
    if (!element || !source) return;
    let active = true;
    let destroy: (() => void) | undefined;
    queueMicrotask(() => { if (active) setPlayerError(""); });
    if (element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = source.url;
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (!active) return;
        if (!Hls.isSupported()) { setPlayerError("This browser does not support HLS playback."); return; }
        const hls = new Hls();
        destroy = () => hls.destroy();
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && active) setPlayerError("Video could not load. Check your connection and retry playback.");
        });
        hls.loadSource(source.url);
        hls.attachMedia(element);
      }).catch(() => { if (active) setPlayerError("The video player could not load."); });
    }
    return () => { active = false; destroy?.(); element.removeAttribute("src"); element.load(); };
  }, [source, retry]);

  return <section className="broadcast-player" aria-label="Broadcast playback">
    <h2>{playback?.title || "Broadcast"}</h2>
    {error ? <p role="alert">{error}</p> : null}
    {source ? <>
      <video ref={video} controls playsInline aria-label={source.kind === "live" ? "Live broadcast" : "Recorded broadcast"}
        onError={() => setPlayerError("Video could not load. Retry playback in a moment.")} />
      <p>{source.kind === "recording" ? "Recording" : "Live broadcast"}{playback?.recording ? ` · ${Math.ceil(playback.recording.duration / 60)} minutes` : ""}</p>
    </> : !error ? <p role="status">{playback?.status === "ENDED" ? "The broadcast ended. Its recording is being prepared or is no longer available." : "Waiting for the creator to start broadcasting…"}</p> : null}
    {playerError ? <div role="alert"><p>{playerError}</p><button type="button" onClick={() => setRetry((current) => current + 1)}>Retry playback</button></div> : null}
  </section>;
}
