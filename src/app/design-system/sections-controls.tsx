"use client";

import { useState } from "react";
import { ArrowRight, Download, MoreHorizontal, Trash2, Copy, ExternalLink } from "lucide-react";
import { Button, IconButton } from "@/components/nv/button";
import { Input, Textarea } from "@/components/nv/field";
import { Combobox, type ComboboxOption } from "@/components/nv/combobox";
import { Tabs } from "@/components/nv/tabs";
import { Menu } from "@/components/nv/menu";
import { Tooltip } from "@/components/nv/tooltip";
import { Section, Specimen } from "./section";

const repos: ComboboxOption[] = [
  { value: "vercel/next.js", label: "vercel/next.js", description: "public" },
  { value: "facebook/react", label: "facebook/react", description: "public" },
  { value: "torvalds/linux", label: "torvalds/linux", description: "public" },
  { value: "rust-lang/rust", label: "rust-lang/rust", description: "public" },
];

export function ControlsSections() {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string>("");
  const [state, setState] = useState<"ok" | "loading" | "error" | "empty">("ok");
  const options =
    state === "ok" ? repos.filter((r) => r.label.includes(q.toLowerCase())) : [];

  return (
    <>
      <Section id="buttons" title="Buttons" lede="44px minimum height and width. Loading keeps focus and blocks activation (aria-busy). Disabled uses the native attribute and 45% opacity; label contrast is not relied on for disabled text.">
        <Specimen label="Variants x states (default, loading, disabled)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
              <div key={v} className="flex flex-col items-start gap-3">
                <Button variant={v} trailing={<ArrowRight className="size-4" />}>{v}</Button>
                <Button variant={v} loading>Working</Button>
                <Button variant={v} disabled>Disabled</Button>
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen label="Icon buttons (label required) and large size">
          <div className="flex flex-wrap items-center gap-3">
            <IconButton label="Download report" icon={<Download className="size-4" />} />
            <IconButton label="Delete" variant="danger" icon={<Trash2 className="size-4" />} />
            <IconButton label="Disabled action" disabled icon={<Copy className="size-4" />} />
            <Button size="lg" variant="primary">Analyze repository</Button>
          </div>
        </Specimen>
      </Section>

      <Section id="inputs" title="Inputs and combobox" lede="Every field has a visible or screen-reader label, hint or error wired by aria-describedby, and a 3:1 boundary. The combobox follows the ARIA 1.2 list-autocomplete pattern.">
        <div className="grid gap-6 md:grid-cols-2">
          <Input label="GitHub username" placeholder="octocat" hint="Public profile only." />
          <Input label="Repository URL" defaultValue="github.com/nope" error="Enter owner/repo or a github.com URL." />
          <Input label="Disabled field" disabled defaultValue="Locked" />
          <Textarea label="Question for the repository" placeholder="Where is authentication handled?" hint="Answers cite files and commits." />
        </div>
        <Specimen label="Combobox: type, arrows, Home/End, Enter, Esc (clear), tap an option">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Combobox
                label="Find a profile or repository"
                options={options}
                value={q}
                onValueChange={setQ}
                onSelect={(o) => setPicked(o.value)}
                onSubmit={(t) => setPicked(t)}
                placeholder="octocat or vercel/next.js"
                loading={state === "loading"}
                error={state === "error" ? "GitHub did not respond. Try again." : undefined}
                emptyText="No cached matches. Press Enter to look it up."
              />
              <p className="mt-2 text-nv-small text-nv-ivory-300" role="status">Chosen: <span className="font-nv-mono">{picked || "nothing yet"}</span></p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {(["ok", "loading", "error", "empty"] as const).map((s) => (
                <Button key={s} variant={state === s ? "primary" : "secondary"} onClick={() => setState(s)}>{s}</Button>
              ))}
              <p className="w-full text-nv-small text-nv-ivory-300">Switch list state to review async variants.</p>
            </div>
          </div>
          <div className="mt-4 max-w-md"><Combobox label="Disabled combobox" disabled options={[]} value="" onValueChange={() => {}} /></div>
        </Specimen>
      </Section>

      <Section id="tabs-menu" title="Tabs, menu and tooltip">
        <Tabs
          label="Repository views"
          items={[
            { id: "files", label: "Files", count: 412, panel: <p className="text-nv-ivory-200">File tree and chat. Arrow keys move between tabs; Home and End jump.</p> },
            { id: "arch", label: "Architecture", panel: <p className="text-nv-ivory-200">Diagram with a text outline alternative.</p> },
            { id: "sec", label: "Security", count: 3, panel: <p className="text-nv-ivory-200">Findings with measured / inferred basis.</p> },
            { id: "dis", label: "Disabled", disabled: true, panel: null },
          ]}
        />
        <div className="flex flex-wrap items-center gap-6">
          <Menu
            label="Report actions"
            trigger={<MoreHorizontal aria-hidden className="size-5" />}
            items={[
              { id: "copy", label: "Copy share link", icon: <Copy className="size-4" />, onSelect: () => {} },
              { id: "open", label: "Open on GitHub", icon: <ExternalLink className="size-4" />, href: "https://github.com" },
              { id: "off", label: "Export (unavailable)", disabled: true },
              { id: "del", label: "Delete report", icon: <Trash2 className="size-4" />, danger: true },
            ]}
          />
          <Tooltip text="Commit sha, 7 chars">
            <button type="button" className="min-h-11 rounded-nv-sm border border-nv-graphite-500 px-3 font-nv-mono text-nv-small">a1b2c3d</button>
          </Tooltip>
        </div>
      </Section>
    </>
  );
}
