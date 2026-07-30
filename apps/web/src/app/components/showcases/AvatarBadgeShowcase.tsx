"use client";
import React from "react";
import { Avatar, Badge } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const AvatarBadgeShowcase = () => {
  return (
    <ComponentPreview title="Avatar & Badges">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Avatar size="xs" alt="x" />
          <span className="text-sm">XS</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar size="sm" alt="x" />
          <span className="text-sm">SM</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar size="md" alt="x" />
          <span className="text-sm">MD</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar size="lg" alt="x" />
          <span className="text-sm">LG</span>
        </div>

        <div className="ml-6 flex items-center gap-2">
          <Badge variant="live">LIVE</Badge>
          <Badge variant="default">NEW</Badge>
          <Badge variant="danger">OFFLINE</Badge>
          <Badge variant="success">ADMIN</Badge>
        </div>
      </div>
    </ComponentPreview>
  );
};

export default AvatarBadgeShowcase;
