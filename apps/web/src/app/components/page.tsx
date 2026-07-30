"use client";
import React from "react";
import ComponentSection from "./_components/ComponentSection";
import ButtonShowcase from "./showcases/ButtonShowcase";
import InputShowcase from "./showcases/InputShowcase";
import CardShowcase from "./showcases/CardShowcase";
import AvatarBadgeShowcase from "./showcases/AvatarBadgeShowcase";
import FormShowcase from "./showcases/FormShowcase";
import NavShowcase from "./showcases/NavShowcase";
import StreamShowcase from "./showcases/StreamShowcase";
import ChatShowcase from "./showcases/ChatShowcase";
import AnalyticsShowcase from "./showcases/AnalyticsShowcase";

export default function ComponentsPage() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Component Library</h1>
        <p className="text-slate-500 mt-2">Reusable UI components used throughout LiveCast.</p>
      </header>

      <ComponentSection title="Core UI">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ButtonShowcase />
          <InputShowcase />
          <CardShowcase />
          <AvatarBadgeShowcase />
        </div>
      </ComponentSection>

      <ComponentSection title="Forms">
        <FormShowcase />
      </ComponentSection>

      <ComponentSection title="Navigation">
        <NavShowcase />
      </ComponentSection>

      <ComponentSection title="Stream Components">
        <StreamShowcase />
      </ComponentSection>

      <ComponentSection title="Chat">
        <ChatShowcase />
      </ComponentSection>

      <ComponentSection title="Analytics">
        <AnalyticsShowcase />
      </ComponentSection>

      <footer className="mt-8 text-sm text-slate-500">This page is for development use only.</footer>
    </main>
  );
}
