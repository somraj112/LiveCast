"use client";
import { useState } from "react";
import ButtonShowcase from "./showcases/ButtonShowcase";
import InputShowcase from "./showcases/InputShowcase";
import CardShowcase from "./showcases/CardShowcase";
import AvatarBadgeShowcase from "./showcases/AvatarBadgeShowcase";
import FormShowcase from "./showcases/FormShowcase";
import NavShowcase from "./showcases/NavShowcase";
import StreamShowcase from "./showcases/StreamShowcase";
import ChatShowcase from "./showcases/ChatShowcase";
import AnalyticsShowcase from "./showcases/AnalyticsShowcase";
import "./library.css";

const sections = [
  {
    name: "Foundations",
    text: "The actions, labels, and surfaces that give each channel a familiar feel.",
    content: (
      <div className="kit-grid">
        <ButtonShowcase />
        <AvatarBadgeShowcase />
        <InputShowcase />
        <CardShowcase />
      </div>
    ),
  },
  {
    name: "Forms",
    text: "Try the controls for setting up a broadcast.",
    content: <FormShowcase />,
  },
  {
    name: "Navigation",
    text: "Move between sections of a broadcast workspace.",
    content: <NavShowcase />,
  },
  {
    name: "Broadcasts",
    text: "Compare channel layouts and follow a sample creator.",
    content: <StreamShowcase />,
  },
  {
    name: "Chat",
    text: "Send a sample message to the studio.",
    content: <ChatShowcase />,
  },
  {
    name: "Analytics",
    text: "A snapshot of audience and engagement metrics.",
    content: <AnalyticsShowcase />,
  },
];
export default function ComponentsPage() {
  const [active, setActive] = useState(0);
  const current = sections[active];
  return (
    <main id="content" className="wrap kit">
      <header className="kit-head">
        <div>
          <span className="eyebrow">
            <i className="signal-dot" /> LiveCast / Design system
          </span>
          <h1 className="kit-title">
            Component library<span>.</span>
          </h1>
          <p>A field guide to the pieces behind every broadcast.</p>
        </div>
        <div className="kit-swatches" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </header>
      <div className="kit-body">
        <nav className="kit-index" aria-label="Component families">
          <strong className="eyebrow">Collection index</strong>
          {sections.map((s, i) => (
            <button
              type="button"
              key={s.name}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s.name}
            </button>
          ))}
        </nav>
        <section aria-labelledby="kit-family" className="kit-family">
          <div className="eyebrow">Collection / 0{active + 1}</div>
          <h2 id="kit-family">{current.name}</h2>
          <p>{current.text}</p>
          {current.content}
        </section>
      </div>
    </main>
  );
}
