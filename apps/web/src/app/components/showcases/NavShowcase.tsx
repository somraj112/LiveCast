"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Navbar,
  Sidebar,
  SidebarItem,
  Breadcrumb,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@streamline/ui";
import ComponentPreview from "../_components/ComponentPreview";
export default function NavShowcase() {
  const [collapsed, setCollapsed] = useState(false);
  const links = (
    <div className="flex gap-4 text-sm">
      <Link href="/">Discover</Link>
      <Link href="/login">Log in</Link>
    </div>
  );
  return (
    <ComponentPreview title="Studio navigation">
      <div className="space-y-5">
        <Navbar
          sticky={false}
          brand={<strong>LiveCast</strong>}
          leftSlot={links}
        >
          {links}
        </Navbar>
        <div className="grid gap-5 lg:grid-cols-2">
          <Sidebar
            collapsed={collapsed}
            onToggle={setCollapsed}
            className="max-w-full"
          >
            <SidebarItem href="/" label="Discover" />
            <SidebarItem href="/components" label="Library" active />
            <SidebarItem href="/signup" label="Join LiveCast" />
          </Sidebar>
          <div>
            <Breadcrumb
              items={[{ label: "Discover", href: "/" }, { label: "Studio" }]}
            />
            <Tabs defaultValue="broadcast">
              <TabsList aria-label="Studio preview">
                <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
              </TabsList>
              <TabsContent value="broadcast">
                After Hours Radio · Studio Meridian
              </TabsContent>
              <TabsContent value="audience">1,240 sample viewers</TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
}
