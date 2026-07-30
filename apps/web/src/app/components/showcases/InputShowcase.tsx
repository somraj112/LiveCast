"use client";
import React from "react";
import { Input, PasswordInput } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const InputShowcase = () => {
  return (
    <ComponentPreview title="Inputs">
      <div className="flex flex-col gap-3">
        <Input placeholder="Default" />
        <Input type="email" placeholder="email@example.com" />
        <PasswordInput placeholder="Password" />
        <Input placeholder="Disabled" disabled />
        <Input placeholder="Error state (TODO styling)" aria-invalid />
      </div>
    </ComponentPreview>
  );
};

export default InputShowcase;
