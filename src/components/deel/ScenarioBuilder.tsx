'use client';

import React, { useState } from 'react';
import type { ScenarioEvent, CountryCode, WorkerType, EventType, Quarter, JobFunction } from '@/engine/types';

interface ScenarioBuilderProps {
  events: ScenarioEvent[];
  onAddEvent: (event: ScenarioEvent) => void;
  onRemoveEvent: (id: string) => void;
  onRunSimulation: () => void;
  onWowButton: (preset: 1 | 2 | 3) => void;
  isRunning: boolean;
}

const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'US', label: '🇺🇸 United States' },
];

const WORKER_TYPES: { value: WorkerType; label: string }[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'eor_employee', label: 'EOR Employee' },
  { value: 'direct_employee', label: 'Direct Employee' },
];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'contractor_conversion', label: 'Contractor → Employee' },
  { value: 'termination', label: 'Termination' },
  { value: 'relocation', label: 'Cross-Border Relocation' },
  { value: 'eor_onboarding', label: 'EOR Onboarding' },
];

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const JOB_FUNCTIONS: JobFunction[] = [
  'Engineering', 'Sales', 'Operations', 'Finance', 'HR', 'Marketing',
];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  contractor_conversion: '#C4B5FD',
  termination: '#FC8181',
  relocation: '#7DD3FC',
  eor_onboarding: '#4ADE9A',
};

const WORKER_LABELS: Record<WorkerType, string> = {
  contractor: 'Contractor',
  eor_employee: 'EOR',
  direct_employee: 'Direct',
};

const EVENT_LABELS_SHORT: Record<EventType, string> = {
  contractor_conversion: 'Conversion',
  termination: 'Termination',
  relocation: 'Relocation',
  eor_onboarding: 'EOR Onboard',
};

const defaultForm = {
  country: 'ES' as CountryCode,
  workerType: 'contractor' as WorkerType,
  eventType: 'contractor_conversion' as EventType,
  jobFunction: 'Engineering' as JobFunction,
  quantity: 3,
  timingQuarter: 'Q3' as Quarter,
  avgAnnualSalaryUsd: 80000,
  destinationCountry: undefined as CountryCode | undefined,
};

const inputClass =
  'w-full bg-[#1A1F35] border border-[#2D3450] rounded-lg px-3 py-2 text-[#EDF0F7] text-sm ' +
  'hover:border-[#7B6FD4]/50 focus:outline-none focus:border-[#7B6FD4] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] transition-colors';

const labelClass = 'block text-[#A8B4C8] text-xs font-medium mb-1';

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

export default function ScenarioBuilder({
  events,
  onAddEvent,
  onRemoveEvent,
  onRunSimulation,
  onWowButton,
  isRunning,
}: ScenarioBuilderProps) {
  const [form, setForm] = useState(defaultForm);

  function handleAdd() {
    if (form.quantity < 1) return;
    const event: ScenarioEvent = {
      id: Math.random().toString(36).slice(2, 10),
      country: form.country,
      workerType: form.workerType,
      eventType: form.eventType,
      jobFunction: form.jobFunction,
      quantity: form.quantity,
      timingQuarter: form.timingQuarter,
      avgAnnualSalaryUsd: form.avgAnnualSalaryUsd,
      destinationCountry: form.eventType === 'relocation' ? form.destinationCountry : undefined,
    };
    onAddEvent(event);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
        <h2 className="text-[#F1F5F9] text-sm font-semibold">Scenario Builder</h2>
        <p className="text-[#8899B2] text-xs mt-0.5">Configure workforce events</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Wow buttons */}
        <div>
          <div className={labelClass}>Quick Scenarios</div>
          <div className="space-y-2">
            {[
              {
                n: 1 as const,
                label: '🔄 Convert 12 Contractors ES + DE',
                sub: 'Spain & Germany · Q3',
              },
              {
                n: 2 as const,
                label: '✈️ Relocate Team US → UK',
                sub: 'Illustrative equity friction · Q2',
              },
              {
                n: 3 as const,
                label: '⚠️ Terminate 5 EOR · Germany Q2',
                sub: 'Clustered exits · High friction',
              },
            ].map(({ n, label, sub }) => (
              <button
                key={n}
                onClick={() => onWowButton(n)}
                className={`w-full text-left rounded-lg border border-[#2D3450] hover:border-[#7B6FD4] bg-[#1A1F35] hover:bg-[#1E2340] px-3 py-2.5 transition-all group ${btnFocus}`}
              >
                <div className="text-[#EDF0F7] text-xs font-medium group-hover:text-[#C4B5FD] transition-colors">
                  {label}
                </div>
                <div className="text-[#8899B2] text-[10px] mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#2D3450]" />

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Country</label>
              <select
                className={inputClass}
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as CountryCode }))}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Worker Type</label>
              <select
                className={inputClass}
                value={form.workerType}
                onChange={(e) => setForm((f) => ({ ...f, workerType: e.target.value as WorkerType }))}
              >
                {WORKER_TYPES.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Event Type</label>
            <select
              className={inputClass}
              value={form.eventType}
              onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value as EventType }))}
            >
              {EVENT_TYPES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          {form.eventType === 'relocation' && (
            <div>
              <label className={labelClass}>Destination Country</label>
              <select
                className={inputClass}
                value={form.destinationCountry ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    destinationCountry: (e.target.value as CountryCode) || undefined,
                  }))
                }
              >
                <option value="">— Select destination —</option>
                {COUNTRIES.filter((c) => c.code !== form.country).map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Job Function</label>
            <select
              className={inputClass}
              value={form.jobFunction}
              onChange={(e) => setForm((f) => ({ ...f, jobFunction: e.target.value as JobFunction }))}
            >
              {JOB_FUNCTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                className={inputClass}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className={labelClass}>Timing Quarter</label>
              <select
                className={inputClass}
                value={form.timingQuarter}
                onChange={(e) => setForm((f) => ({ ...f, timingQuarter: e.target.value as Quarter }))}
              >
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Avg Annual Salary (USD)</label>
            <input
              type="number"
              min={10000}
              step={5000}
              className={inputClass}
              value={form.avgAnnualSalaryUsd}
              onChange={(e) =>
                setForm((f) => ({ ...f, avgAnnualSalaryUsd: parseInt(e.target.value) || 50000 }))
              }
            />
          </div>

          <button
            onClick={handleAdd}
            className={`w-full rounded-lg bg-[#7B6FD4] hover:bg-[#8B7FE0] text-white text-sm font-medium py-2.5 transition-colors ${btnFocus}`}
          >
            + Add to Scenario
          </button>
        </div>

        {/* Staged events */}
        {events.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className={labelClass}>Staged Plan ({events.length})</div>
            </div>
            <div className="space-y-1.5">
              {events.map((evt) => {
                const color = EVENT_TYPE_COLORS[evt.eventType];
                return (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-[#2D3450] bg-[#1A1F35] px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ color, background: `${color}22` }}
                        >
                          {EVENT_LABELS_SHORT[evt.eventType]}
                        </span>
                        <span className="text-[#A8B4C8] text-[10px]">
                          {evt.country}
                          {evt.destinationCountry && ` → ${evt.destinationCountry}`}
                        </span>
                        <span className="text-[#A8B4C8] text-[10px]">{evt.timingQuarter}</span>
                      </div>
                      <div className="text-[#EDF0F7] text-xs mt-0.5 leading-tight">
                        {evt.quantity}× {WORKER_LABELS[evt.workerType]} · {evt.jobFunction}
                      </div>
                      <div className="text-[#8899B2] text-[10px] mt-0.5">
                        ${evt.avgAnnualSalaryUsd.toLocaleString()} / yr
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveEvent(evt.id)}
                      className={`text-[#8899B2] hover:text-[#FC8181] hover:bg-[#1F1214] text-sm leading-none flex-shrink-0 transition-colors mt-0.5 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FC8181]`}
                      aria-label="Remove event"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="px-4 py-3 border-t border-[#2D3450] flex-shrink-0">
        <button
          onClick={onRunSimulation}
          disabled={events.length === 0 || isRunning}
          className={`w-full rounded-lg py-3 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnFocus}`}
          style={{
            background: events.length > 0
              ? 'linear-gradient(135deg, #7B6FD4 0%, #5F54B0 100%)'
              : '#1A1F35',
            color: events.length > 0 ? 'white' : '#8899B2',
          }}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </span>
          ) : (
            `Preview Impact${events.length > 0 ? ` (${events.length} events)` : ''}`
          )}
        </button>
        {events.length === 0 && (
          <p className="text-[#8899B2] text-[10px] text-center mt-1.5">
            Add events or use a quick scenario above
          </p>
        )}
      </div>
    </div>
  );
}
