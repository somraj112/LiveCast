"use client";
import React from "react";
import { Button } from "@streamline/ui";
import { Plus } from "lucide-react";
import ComponentPreview from "../_components/ComponentPreview";

export const ButtonShowcase = () => {
  return (
    <ComponentPreview title="Buttons">
      <div className="flex flex-wrap gap-3 items-center">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button icon={<Plus className="h-4 w-4" />}>With Icon</Button>
      </div>
    </ComponentPreview>
  );
};

export default ButtonShowcase;
