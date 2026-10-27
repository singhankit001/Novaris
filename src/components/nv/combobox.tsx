"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "./cn";
import { controlClasses } from "./field";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface ComboboxProps {
  label: string;
  hideLabel?: boolean;
  options: ComboboxOption[];
  /** Controlled text. */
  value: string;
  onValueChange: (text: string) => void;
  /** Fired when an option is chosen (Enter, click, tap). */
  onSelect?: (option: ComboboxOption) => void;
  /** Fired on Enter with no active option (free-text submit). */
  onSubmit?: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  error?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/** ARIA 1.2 editable combobox with list autocomplete. DOM focus stays in the input. */
export function Combobox({
  label,
  hideLabel,
  options,
  value,
  onValueChange,
  onSelect,
  onSubmit,
  placeholder,
  loading,
  error,
  emptyText = "No matches",
  disabled,
  className,
}: ComboboxProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const showPanel = open && !disabled && (options.length > 0 || loading || !!error || value.length > 0);
  const optId = (i: number) => `${uid}-opt-${i}`;

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    onSelect?.(o);
    onValueChange(o.label);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = options.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        if (n) setActive((a) => (a + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        if (n) setActive((a) => (a <= 0 ? n - 1 : a - 1));
        break;
      case "Home":
        if (open && n) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open && n) {
          e.preventDefault();
          setActive(n - 1);
        }
        break;
      case "Enter":
        if (open && active >= 0) {
          e.preventDefault();
          choose(active);
        } else if (onSubmit && value.trim()) {
          e.preventDefault();
          onSubmit(value.trim());
          setOpen(false);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (value) {
          onValueChange("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className={cn("relative flex flex-col gap-1.5", className)}>
      <label htmlFor={`${uid}-input`} className={cn("text-nv-small font-medium text-nv-ivory-200", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nv-ivory-300" />
        <input
          ref={inputRef}
          id={`${uid}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={showPanel && active >= 0 ? optId(active) : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          className={cn(controlClasses, "min-h-12 pl-10 pr-3 text-base")}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!showPanel}
        className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-nv-md border border-nv-graphite-700 bg-white p-1.5 shadow-nv-popover"
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={optId(i)}
            role="option"
            aria-selected={i === active}
            // Prevent input blur so the click lands before the list closes.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(i)}
            onMouseMove={() => active !== i && setActive(i)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-nv-sm px-3 py-2 text-nv-body",
              i === active ? "bg-nv-copper-wash text-nv-ivory-50" : "text-nv-ivory-200",
            )}
          >
            {o.icon && <span aria-hidden>{o.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{o.label}</span>
            {o.description && <span className="nv-num shrink-0 text-nv-micro text-nv-ivory-300">{o.description}</span>}
          </li>
        ))}
        {options.length === 0 && (
          <li role="presentation" className="px-3 py-3 text-nv-small text-nv-ivory-300">
            {error ? <span className="text-nv-danger">{error}</span> : loading ? "Searching GitHub" : emptyText}
          </li>
        )}
      </ul>
      <span role="status" aria-live="polite" className="sr-only">
        {showPanel ? (loading ? "Searching" : `${options.length} suggestions`) : ""}
      </span>
    </div>
  );
}
