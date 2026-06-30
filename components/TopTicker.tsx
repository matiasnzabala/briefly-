"use client";

import { useEffect, useState } from "react";
import type { DolarRate } from "@/app/api/dolar/route";

const SHOWN_CASAS = ["oficial", "blue"];

interface Clima {
  temperature: number | null;
  description: string;
  emoji: string;
}

interface Feriado {
  fecha: string;
  nombre: string;
}

interface RiesgoPais {
  valor: number;
  fecha: string;
}

function formatFeriadoDate(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export default function TopTicker() {
  const [rates, setRates] = useState<DolarRate[] | null>(null);
  const [clima, setClima] = useState<Clima | null>(null);
  const [feriado, setFeriado] = useState<Feriado | null>(null);
  const [riesgoPais, setRiesgoPais] = useState<RiesgoPais | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dolar")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.rates) setRates(json.rates);
      })
      .catch(() => {});

    fetch("/api/clima")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && typeof json.temperature !== "undefined") {
          setClima(json);
        }
      })
      .catch(() => {});

    fetch("/api/feriados")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.next) setFeriado(json.next);
      })
      .catch(() => {});

    fetch("/api/riesgo-pais")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && typeof json.valor === "number") setRiesgoPais(json);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const shownRates = rates
    ? SHOWN_CASAS.map((casa) => rates.find((r) => r.casa === casa)).filter(
        (r): r is DolarRate => Boolean(r)
      )
    : [];

  if (shownRates.length === 0 && !clima && !feriado && !riesgoPais)
    return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {shownRates.map((r) => (
        <span
          key={r.casa}
          className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5"
        >
          <span>💵</span>
          <span className="text-neutral-500">{r.nombre}</span>
          <span className="text-neutral-200 font-medium">
            ${r.compra.toLocaleString("es-AR")} / $
            {r.venta.toLocaleString("es-AR")}
          </span>
        </span>
      ))}

      {clima && clima.temperature !== null && (
        <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5">
          <span>{clima.emoji || "📍"}</span>
          <span className="text-neutral-500">Buenos Aires</span>
          <span className="text-neutral-200 font-medium">
            {Math.round(clima.temperature)}°C
          </span>
          <span className="text-neutral-500">{clima.description}</span>
        </span>
      )}

      {riesgoPais && (
        <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5">
          <span>📈</span>
          <span className="text-neutral-500">Riesgo país</span>
          <span className="text-neutral-200 font-medium">
            {riesgoPais.valor.toLocaleString("es-AR")} pb
          </span>
        </span>
      )}

      {feriado && (
        <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5">
          <span>📅</span>
          <span className="text-neutral-500">Próximo feriado</span>
          <span className="text-neutral-200 font-medium">
            {formatFeriadoDate(feriado.fecha)}
          </span>
          <span className="text-neutral-500">— {feriado.nombre}</span>
        </span>
      )}
    </div>
  );
}
