"use client";
import React from "react";
import { Card } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const CardShowcase = () => {
  return (
    <ComponentPreview title="Cards">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">Normal card content</Card>
        <Card className="p-4 hover:shadow-lg transition">Interactive card (hover)</Card>
        <Card className="p-6">Detailed card with more padding</Card>
      </div>
    </ComponentPreview>
  );
};

export default CardShowcase;
