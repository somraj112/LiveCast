"use client";
import React from "react";
import { Navbar, Sidebar, SidebarItem, Breadcrumb, Tabs, TabsList, TabsTrigger, TabsContent } from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";

export const NavShowcase = () => {
  return (
    <ComponentPreview title="Navigation">
      <div className="space-y-4">
        <div>
          <Navbar brand={<strong>LiveCast</strong>} leftSlot={<div className="text-sm">Browse</div>} rightSlot={<div className="text-sm">Account</div>} />
        </div>

        <div className="flex gap-4">
          <div className="w-64">
            <Sidebar>
              <SidebarItem href="#" label="Home" active />
              <SidebarItem href="#" label="Browse" />
              <SidebarItem href="#" label="Creator Studio" />
            </Sidebar>
          </div>

          <div className="flex-1">
            <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Streams" }]} />

            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">Tab One</TabsTrigger>
                <TabsTrigger value="two">Tab Two</TabsTrigger>
              </TabsList>

              <TabsContent value="one">Content for tab one</TabsContent>
              <TabsContent value="two">Content for tab two</TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
};

export default NavShowcase;
