"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/components/nv/cn";

export interface GooeyInputProps {
  /** Accessible name (rendered visually hidden). */
  label: string;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  onSubmitValue?: (value: string) => void;
  className?: string;
}

/** Shapes drawn behind the field. `grow` is the slightly larger copy that becomes the goo outline. */
function Shapes({ expanded, tone, grow, pulse }: { expanded: boolean; tone: string; grow?: boolean; pulse: boolean }) {
  return (
    <div className={cn("absolute", grow ? "-inset-[1.5px]" : "inset-0")}>
      <div
        className={cn("absolute left-0 top-0 h-full rounded-full transition-[width] duration-500 ease-nv-out motion-reduce:transition-none", tone, expanded ? "w-[calc(100%-55px)]" : "w-full")}
      />
      <div
        className={cn("absolute right-0 top-0 aspect-square h-full rounded-full transition-transform duration-300 ease-nv-out motion-reduce:transition-none", tone, pulse && "scale-110")}
      />
    </div>
  );
}

/** Search field whose pill splits from its submit bubble on focus. The goo is a decorative SVG-filtered layer; the input and button are native and unfiltered. */
export function GooeyInput({ label, placeholder = "Search", name = "q", defaultValue = "", onSubmitValue, className }: GooeyInputProps) {
  const uid = useId();
  const filterId = `goo-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [pulse, setPulse] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const expanded = focused || value.length > 0;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmitValue?.(value.trim());
    setPulse(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPulse(false), 260);
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      className={cn("relative h-12 w-full max-w-md", className)}
    >
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id={filterId} x="-10%" y="-60%" width="120%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
        </filter>
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        <Shapes expanded={expanded} grow tone="bg-nv-graphite-500" pulse={pulse} />
        <Shapes expanded={expanded} tone="bg-white" pulse={pulse} />
      </div>
      <label htmlFor={`${uid}-in`} className="sr-only">
        {label}
      </label>
      <input
        id={`${uid}-in`}
        name={name}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "absolute left-0 top-0 h-full rounded-full bg-transparent pl-5 pr-3 text-nv-body text-nv-ivory-100 placeholder:text-nv-graphite-400",
          "transition-[width] duration-500 ease-nv-out motion-reduce:transition-none",
          expanded ? "w-[calc(100%-55px)]" : "w-[calc(100%-48px)]",
        )}
      />
      <button
        type="submit"
        aria-label={`Submit ${label.toLowerCase()}`}
        className="absolute right-0 top-0 grid size-12 place-items-center rounded-full text-nv-ivory-100 outline-offset-2 transition-colors hover:text-nv-copper-400"
      >
        <Search aria-hidden className="size-5" />
      </button>
    </form>
  );
}
