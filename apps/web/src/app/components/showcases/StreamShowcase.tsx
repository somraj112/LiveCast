"use client";
import { useState } from "react";
import {
  StreamCard,
  CreatorCard,
  LiveBadge,
  ViewerCount,
} from "@streamline/ui";
import { programs, artwork } from "../../_ui/programs";
import ComponentPreview from "../_components/ComponentPreview";
export default function StreamShowcase() {
  const [follow, setFollow] = useState(false);
  const p = programs[1],
    data = {
      title: p.title,
      creatorName: p.creator,
      category: p.category,
      viewers: p.viewers,
      thumbnail: artwork(p),
    };
  return (
    <div className="kit-grid">
      <ComponentPreview title="Standard channel">
        <StreamCard {...data} isLive />
      </ComponentPreview>
      <ComponentPreview title="Detailed channel">
        <StreamCard {...data} variant="detailed" />
      </ComponentPreview>
      <ComponentPreview title="Compact channel">
        <StreamCard {...data} variant="compact" />
      </ComponentPreview>
      <ComponentPreview title="Creator & status">
        <CreatorCard
          username={p.creator}
          followers={follow ? 1235 : 1234}
          followed={follow}
          onFollow={() => setFollow(!follow)}
        />
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <LiveBadge />
          <LiveBadge variant="offline" />
          <LiveBadge variant="ended" />
          <ViewerCount count={p.viewers} />
        </div>
      </ComponentPreview>
    </div>
  );
}
