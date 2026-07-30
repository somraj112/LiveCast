"use client";
import React from "react";
import { Input, Checkbox, RadioGroup, RadioItem, Switch, Select, SelectItem, PasswordInput } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const FormShowcase = () => {
  return (
    <ComponentPreview title="Form Components">
      <div className="flex flex-col gap-4">
        <Input placeholder="Search streams" />
        <PasswordInput placeholder="Password" />
        <div className="flex items-center gap-4">
          <Checkbox label="Remember me" defaultChecked />
          <Switch label="Enable notifications" />
        </div>

        <RadioGroup defaultValue="public" className="flex flex-row gap-3">
          <RadioItem value="public" label="Public" />
          <RadioItem value="private" label="Private" />
        </RadioGroup>

        <div className="w-60">
          <Select placeholder="Category">
            <SelectItem value="1">Gaming</SelectItem>
            <SelectItem value="2">Music</SelectItem>
            <SelectItem value="3">Coding</SelectItem>
          </Select>
        </div>
      </div>
    </ComponentPreview>
  );
};

export default FormShowcase;
