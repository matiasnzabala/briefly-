"use client";

import { useEffect, useState } from "react";
import type { JobOffer } from "@/app/api/trabajos/route";

export default function JobsPanel() {
  const [jobs, setJobs] = useState<JobOffer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trabajos")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.jobs) setJobs(json.jobs);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Ofertas de trabajo — Argentina
      </h2>

      {jobs === null && (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>Cargando ofertas…</p>
      )}

      {jobs !== null && jobs.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          No hay ofertas disponibles por ahora.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {jobs?.map((job) => (
          <a
            key={job.id}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-3 flex flex-col gap-1 transition-colors"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <span className="text-sm font-medium leading-snug" style={{ color: "var(--text)" }}>
              {job.title}
            </span>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {job.company}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {job.location}
            </span>
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--accent-bg)", color: "var(--accent-text)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
