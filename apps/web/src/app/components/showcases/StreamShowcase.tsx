"use client";
import React from "react";
import { StreamCard, CreatorCard, LiveBadge, ViewerCount, StreamThumbnail, StreamListSkeleton } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

const mock = {
  title: "Building LiveCast",
  creatorName: "Somraj",
  category: "Coding",
  viewers: 1243,
  thumbnail: "/sample-thumb.jpg",
  creatorAvatar: "/avatar.jpg"
};

export const StreamShowcase = () => {
  return (
    <ComponentPreview title="Stream Components">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StreamCard {...mock} isLive />
        <StreamCard {...mock} variant="compact" />
        <StreamCard {...mock} variant="detailed" />

        <div>
          <CreatorCard username={mock.creatorName} followers={1234} avatarSrc={mock.creatorAvatar} />
        </div>

        <div className="flex items-center gap-3">
          <LiveBadge variant="live" />
          <LiveBadge variant="offline" />
          <LiveBadge variant="ended" />
        </div>

        <div>
          <ViewerCount count={mock.viewers} />
        </div>

        <div>
          <StreamThumbnail src={mock.thumbnail} alt={mock.title} />
        </div>

        <div>
          <StreamListSkeleton count={4} />
        </div>
      </div>
    </ComponentPreview>
  );
};

export default StreamShowcase;
