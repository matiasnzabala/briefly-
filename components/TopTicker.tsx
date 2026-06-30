"use client";

import { useEffect, useState } from "react";
import type { DolarRate } from "@/app/api/dolar/route";

const SHOWN_CASAS = ["oficial", "blue"];

interface Clima {
  temperature: number | null;
  description: string;
  emoji: string;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDir: number | null;
  precipitation: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipSum: number | null;
  uvIndex: number | null;
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

function windDirLabel(deg: number | null): string {
  if (deg === null) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "Bajo";
  if (uv <= 5) return "Moderado";
  if (uv <= 7) return "Alto";
  if (uv <= 10) return "Muy alto";
  return "Extremo";
}

function ClimaModal({ clima, onClose }: { clima: Clima; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: { icon: string; label: string; value: string }[] = [];
  if (clima.feelsLike !== null)
    rows.push({ icon: "🌡️", label: "Sensación térmica", value: `${Math.round(clima.feelsLike)}°C` });
  if (clima.tempMax !== null && clima.tempMin !== null)
    rows.push({ icon: "↕️", label: "Máx / Mín", value: `${Math.round(clima.tempMax)}° / ${Math.round(clima.tempMin)}°` });
  if (clima.humidity !== null)
    rows.push({ icon: "💧", label: "Humedad", value: `${clima.humidity}%` });
  if (clima.windSpeed !== null)
    rows.push({ icon: "💨", label: "Viento", value: `${Math.round(clima.windSpeed)} km/h ${windDirLabel(clima.windDir)}` });
  if (clima.precipitation !== null && clima.precipitation > 0)
    rows.push({ icon: "🌧️", label: "Precipitación actual", value: `${clima.precipitation} mm` });
  if (clima.precipSum !== null)
    rows.push({ icon: "☔", label: "Lluvia acumulada hoy", value: `${clima.precipSum} mm` });
  if (clima.uvIndex !== null)
    rows.push({ icon: "☀️", label: "Índice UV", value: `${Math.round(clima.uvIndex)} — ${uvLabel(clima.uvIndex)}` });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <div
        className="glass rounded-xl w-full max-w-xs p-5 flex flex-col gap-4"
        style={{ background: "var(--modal-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{clima.emoji}</span>
              <span className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                {clima.temperature !== null ? `${Math.round(clima.temperature)}°C` : "—"}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{clima.description}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Buenos Aires</p>
          </div>
          <button
            onClick={onClose}
            className="text-sm shrink-0 transition"
            style={{ color: "var(--text-muted)" }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <span>{r.icon}</span>
                {r.label}
              </span>
              <span className="font-medium" style={{ color: "var(--text)" }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TopTicker() {
  const [rates, setRates] = useState<DolarRate[] | null>(null);
  const [clima, setClima] = useState<Clima | null>(null);
  const [feriado, setFeriado] = useState<Feriado | null>(null);
  const [riesgoPais, setRiesgoPais] = useState<RiesgoPais | null>(null);
  const [showClima, setShowClima] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dolar")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.rates) setRates(json.rates); })
      .catch(() => {});

    fetch("/api/clima")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && typeof json.temperature !== "undefined") setClima(json); })
      .catch(() => {});

    fetch("/api/feriados")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.next) setFeriado(json.next); })
      .catch(() => {});

    fetch("/api/riesgo-pais")
      .then((r) => r.json())
      .then((json) => { if (!cancelled && typeof json.valor === "number") setRiesgoPais(json); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const shownRates = rates
    ? SHOWN_CASAS.map((casa) => rates.find((r) => r.casa === casa)).filter(
        (r): r is DolarRate => Boolean(r)
      )
    : [];

  if (shownRates.length === 0 && !clima && !feriado && !riesgoPais) return null;

  const chipStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" };

  return (
    <>
      <div className="flex flex-wrap gap-2 text-xs">
        {shownRates.map((r) => (
          <span key={r.casa} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={chipStyle}>
            <span>💵</span>
            <span style={{ color: "var(--text-muted)" }}>{r.nombre}</span>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              ${r.compra.toLocaleString("es-AR")} / ${r.venta.toLocaleString("es-AR")}
            </span>
          </span>
        ))}

        {clima && clima.temperature !== null && (
          <button
            onClick={() => setShowClima(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all"
            style={{ ...chipStyle, cursor: "pointer" }}
            title="Ver más detalles del clima"
          >
            <span>{clima.emoji || "📍"}</span>
            <span style={{ color: "var(--text-muted)" }}>Buenos Aires</span>
            <span className="font-medium" style={{ color: "var(--text)" }}>{Math.round(clima.temperature)}°C</span>
            <span style={{ color: "var(--text-muted)" }}>{clima.description}</span>
            <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>▾</span>
          </button>
        )}

        {riesgoPais && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={chipStyle}>
            <span>📈</span>
            <span style={{ color: "var(--text-muted)" }}>Riesgo país</span>
            <span className="font-medium" style={{ color: "var(--text)" }}>{riesgoPais.valor.toLocaleString("es-AR")} pb</span>
          </span>
        )}

        {feriado && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={chipStyle}>
            <span>📅</span>
            <span style={{ color: "var(--text-muted)" }}>Próximo feriado</span>
            <span className="font-medium" style={{ color: "var(--text)" }}>{formatFeriadoDate(feriado.fecha)}</span>
            <span style={{ color: "var(--text-muted)" }}>— {feriado.nombre}</span>
          </span>
        )}
      </div>

      {showClima && clima && (
        <ClimaModal clima={clima} onClose={() => setShowClima(false)} />
      )}
    </>
  );
}
