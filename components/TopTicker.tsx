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
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span>💵</span>
          <span style={{ color: "var(--text-muted)" }}>{r.nombre}</span>
          <span className="font-medium" style={{ color: "var(--text)" }}>
            ${r.compra.toLocaleString("es-AR")} / ${r.venta.toLocaleString("es-AR")}
          </span>
        </span>
      ))}

      {clima && clima.temperature !== null && (
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span>{clima.emoji || "📍"}</span>
          <span style={{ color: "var(--text-muted)" }}>Buenos Aires</span>
          <span className="font-medium" style={{ color: "var(--text)" }}>{Math.round(clima.temperature)}°C</span>
          <span style={{ color: "var(--text-muted)" }}>{clima.description}</span>
        </span>
      )}

      {riesgoPais && (
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span>📈</span>
          <span style={{ color: "var(--text-muted)" }}>Riesgo país</span>
          <span className="font-medium" style={{ color: "var(--text)" }}>{riesgoPais.valor.toLocaleString("es-AR")} pb</span>
        </span>
      )}

      {feriado && (
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <span>📅</span>
          <span style={{ color: "var(--text-muted)" }}>Próximo feriado</span>
          <span className="font-medium" style={{ color: "var(--text)" }}>{formatFeriadoDate(feriado.fecha)}</span>
          <span style={{ color: "var(--text-muted)" }}>— {feriado.nombre}</span>
        </span>
      )}
    </div>
  );
}

