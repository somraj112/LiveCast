"use client";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  X,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Button, StreamCard, LiveBadge, ViewerCount } from "@streamline/ui";
import { artwork, programs, type Program } from "./_ui/programs";

export default function Discover() {
  const [filter, setFilter] = useState("All channels");
  const [selected, setSelected] = useState<Program>(programs[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [featured, ...channels] = programs;
  const visible = channels.filter(
    (p) => filter === "All channels" || p.category === filter,
  );
  function open(p: Program) {
    setSelected(p);
    dialog.current?.showModal();
  }
  return (
    <main id="content" className="wrap guide">
      <div className="guide-top">
        <span className="eyebrow">
          <i className="signal-dot" /> Broadcast guide
        </span>
        <span className="edition">LiveCast &nbsp;/&nbsp; Demo edition</span>
      </div>
      <section className="feature" aria-labelledby="featured-title">
        <div className="feature-copy">
          <div className="feature-kicker">
            <Radio size={15} /> Featured broadcast
          </div>
          <h1 id="featured-title">
            After Hours
            <br />
            <em>Radio.</em>
          </h1>
          <p>{featured.description}</p>
          <Button className="feature-cta" onClick={() => open(featured)}>
            Explore channel <ArrowUpRight size={17} />
          </Button>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Illustrated silver turntable with a black vinyl record against signal orange"
        >
          <span className="art-label">Meridian sound system</span>
          <span className="art-serial">Fig. 01 &nbsp; / &nbsp; 33 RPM</span>
        </div>
      </section>
      <section className="lineup" aria-labelledby="lineup-title">
        <div className="lineup-head">
          <div>
            <span className="eyebrow">Channel directory</span>
            <h2 id="lineup-title">
              On the air<span>.</span>
            </h2>
          </div>
          <span className="lineup-count" aria-live="polite">
            {String(visible.length).padStart(2, "0")}{" "}
            {visible.length === 1 ? "channel" : "channels"}
          </span>
        </div>
        <div className="filterbar" role="group" aria-label="Filter by category">
          <SlidersHorizontal size={15} aria-hidden="true" />
          {["All channels", "Design", "Technology", "Music"].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="stream-grid">
          {visible.map((p) => (
            <StreamCard
              key={p.id}
              thumbnail={artwork(p)}
              title={p.title}
              category={p.category}
              creatorName={p.creator}
              viewers={p.viewers}
              isLive
              onClick={() => open(p)}
            />
          ))}
        </div>
      </section>
      <footer className="guide-footer">
        <b>LiveCast</b>
        <span>Independent broadcast guide</span>
        <a href="#content">Back to top ↑</a>
      </footer>
      <dialog
        ref={dialog}
        className="channel-dialog"
        aria-labelledby="channel-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div>
          <div
            className="dialog-art"
            style={{ backgroundImage: "url(" + artwork(selected) + ")" }}
          >
            <button
              aria-label="Close channel details"
              autoFocus
              onClick={() => dialog.current?.close()}
            >
              <X size={18} />
            </button>
          </div>
          <div className="dialog-copy">
            <div className="dialog-flags">
              <LiveBadge>Demo channel</LiveBadge>
              <ViewerCount count={selected.viewers} />
            </div>
            <span className="eyebrow">
              {selected.category} / Channel {selected.id}
            </span>
            <h2 id="channel-title">{selected.title}</h2>
            <strong>{selected.creator}</strong>
            <p>{selected.description}</p>
            <small>
              This preview uses sample listings. Live playback is not available.
            </small>
            <Button variant="ghost" onClick={() => dialog.current?.close()}>
              Back to the guide <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
