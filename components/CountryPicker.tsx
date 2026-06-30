"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/mock-data";

interface Props {
  selected: string[];
  onChange: (codes: string[]) => void;
}

function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/20x15/${code.toLowerCase()}.png`}
      alt=""
      width={20}
      height={15}
      className="rounded-[2px] inline-block shrink-0"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

export default function CountryPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle(code: string) {
    if (selected.includes(code)) {
      const next = selected.filter((c) => c !== code);
      if (next.length > 0) onChange(next);
    } else {
      onChange([...selected, code]);
    }
  }

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const selectedCountries = COUNTRIES.filter((c) => selected.includes(c.code));

  return (
    <div>
      {/* Chips de países seleccionados + botón para abrir */}
      <div className="flex flex-wrap gap-2 items-center">
        {selectedCountries.map((c) => (
          <button
            key={c.code}
            onClick={() => toggle(c.code)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent-text)" }}
          >
            <Flag code={c.code} />
            {c.name}
            <span className="text-[10px] opacity-60">✕</span>
          </button>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition"
          style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          + Agregar país
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "var(--overlay)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="glass rounded-xl w-full max-w-sm flex flex-col overflow-hidden"
            style={{ background: "var(--modal-bg)", maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                Países ({selected.length} seleccionados)
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Búsqueda */}
            <div className="px-4 py-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar país…"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-2 pb-3">
              {filtered.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                  Sin resultados
                </p>
              )}
              {filtered.map((c) => {
                const isSelected = selected.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => toggle(c.code)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition text-left"
                    style={{
                      background: isSelected ? "var(--accent-bg)" : "transparent",
                      color: isSelected ? "var(--accent-text)" : "var(--text)",
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Flag code={c.code} />
                      {c.name}
                    </span>
                    {isSelected && <span className="text-xs shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
