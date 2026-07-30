"use client";
import React from "react";
import { StatCard, MetricCard } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const AnalyticsShowcase = () => {
  return (
    <ComponentPreview title="Analytics">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Peak Viewers" value="2,345" delta={12} description="vs last week" />
        <StatCard label="Avg Watch Time" value="12m" description="per session" />
        <MetricCard label="New Followers" metric="+234" trend="up" />
      </div>
    </ComponentPreview>
  );
};

export default AnalyticsShowcase;
