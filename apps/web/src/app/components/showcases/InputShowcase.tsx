"use client";
import React from "react";
import { Input, PasswordInput } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const InputShowcase = () => {
  return (
    <ComponentPreview title="Inputs">
      <div className="flex flex-col gap-3">
        <Input placeholder="Channel name" aria-label="Channel name" />
        <Input type="email" placeholder="email@example.com" />
        <PasswordInput placeholder="Password" />
        <Input placeholder="Disabled" disabled />
        <Input
          aria-label="Invalid channel name"
          placeholder="Channel name is required"
          aria-invalid
        />
      </div>
    </ComponentPreview>
  );
};

export default InputShowcase;
