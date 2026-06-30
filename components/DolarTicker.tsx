"use client";

import { useEffect, useState } from "react";
import type { DolarRate } from "@/app/api/dolar/route";

const SHOWN_CASAS = ["oficial", "blue"];

export default function DolarTicker() {
  const [rates, setRates] = useState<DolarRate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dolar")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.rates) setRates(json.rates);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rates) return null;

  const shown = SHOWN_CASAS.map((casa) =>
    rates.find((r) => r.casa === casa)
  ).filter((r): r is DolarRate => Boolean(r));

  if (shown.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
      {shown.map((r) => (
        <span key={r.casa} className="flex items-center gap-1">
          <span className="text-neutral-500">{r.nombre}:</span>
          <span className="text-neutral-200 font-medium">
            ${r.venta.toLocaleString("es-AR")}
          </span>
        </span>
      ))}
    </div>
  );
}
