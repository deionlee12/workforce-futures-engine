'use client';

import React, { useState, useMemo } from 'react';
import type { ScenarioEvent, CountryCode, WorkerType, EventType, Quarter, JobFunction } from '@/engine/types';

interface ScenarioBuilderProps {
  events: ScenarioEvent[];
  onAddEvent: (event: ScenarioEvent) => void;
  onRemoveEvent: (id: string) => void;
  onRunSimulation: () => void;
  onWowButton: (preset: 1 | 2 | 3) => void;
  isRunning: boolean;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type SalaryBand = '<50k' | '50-80k' | '80-120k' | '120-200k' | '200k+';

// ── Data ───────────────────────────────────────────────────────────────────────

const COUNTRIES: { code: CountryCode; label: string; flag: string }[] = [
  { code: 'ES', label: 'Spain',   flag: '🇪🇸' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪' },
  { code: 'GB', label: 'UK',      flag: '🇬🇧' },
  { code: 'US', label: 'US',      flag: '🇺🇸' },
];

const WORKER_TYPES: { value: WorkerType; label: string }[] = [
  { value: 'contractor',      label: 'Contractor'      },
  { value: 'eor_employee',    label: 'EOR Employee'    },
  { value: 'direct_employee', label: 'Direct Employee' },
];

const EVENT_TYPES: { value: EventType; label: string; short: string }[] = [
  { value: 'contractor_conversion', label: 'Contractor → Employee',    short: 'Conversion'  },
  { value: 'eor_onboarding',        label: 'EOR Onboarding',           short: 'EOR Onboard' },
  { value: 'relocation',            label: 'Cross-Border Relocation',  short: 'Relocation'  },
  { value: 'termination',           label: 'Termination',              short: 'Termination' },
];

const SALARY_BANDS: { value: SalaryBand; label: string; usd: number }[] = [
  { value: '<50k',     label: '< $50K',        usd:  40_000 },
  { value: '50-80k',   label: '$50K – $80K',   usd:  65_000 },
  { value: '80-120k',  label: '$80K – $120K',  usd: 100_000 },
  { value: '120-200k', label: '$120K – $200K', usd: 160_000 },
  { value: '200k+',    label: '> $200K',        usd: 220_000 },
];

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const JOB_FUNCTIONS: JobFunction[] = [
  'Engineering', 'Sales', 'Operations', 'Finance', 'HR', 'Marketing',
];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  contractor_conversion: '#C4B5FD',
  termination:           '#FC8181',
  relocation:            '#7DD3FC',
  eor_onboarding:        '#4ADE9A',
};

const WORKER_LABELS: Record<WorkerType, string> = {
  contractor:      'Contractor',
  eor_employee:    'EOR',
  direct_employee: 'Direct',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function salaryLabel(usd: number): string {
  if (usd <  50_000) return '<$50K';
  if (usd <  80_000) return '$50-80K';
  if (usd < 120_000) return '$80-120K';
  if (usd < 200_000) return '$120-200K';
  return '>$200K';
}

function computeStageSummary(events: ScenarioEvent[]): string {
  if (events.length === 0) return '';
  const totalWorkers = events.reduce((s, e) => s + e.quantity, 0);
  const countries = [...new Set(events.map((e) => e.country))];
  const qCounts: Record<string, number> = {};
  events.forEach((e) => { qCounts[e.timingQuarter] = (qCounts[e.timingQuarter] ?? 0) + e.quantity; });
  const dominantQ = Object.entries(qCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const parts: string[] = [
    `${events.length} move${events.length !== 1 ? 's' : ''} staged`,
    `${totalWorkers} worker${totalWorkers !== 1 ? 's' : ''}`,
  ];
  if (countries.length > 0) parts.push(countries.join(' + '));
  if (dominantQ) parts.push(`${dominantQ} heavy`);
  return parts.join(' · ');
}

// ── Default form state ─────────────────────────────────────────────────────────

const defaultForm = {
  countries:          ['ES'] as CountryCode[],
  workerType:         'contractor' as WorkerType,
  eventType:          'contractor_conversion' as EventType,
  jobFunction:        'Engineering' as JobFunction,
  quantity:           3,
  timingQuarter:      'Q3' as Quarter,
  salaryBand:         '80-120k' as SalaryBand,
  destinationCountry: undefined as CountryCode | undefined,
};

// ── Style constants ────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-[#1A1F35] border border-[#2D3450] rounded-lg px-3 py-2 text-[#EDF0F7] text-sm ' +
  'hover:border-[#7B6FD4]/50 focus:outline-none focus:border-[#7B6FD4] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] transition-colors';

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#5A6A85]">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#1E2235]" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScenarioBuilder({
  events,
  onAddEvent,
  onRemoveEvent,
  onRunSimulation,
  onWowButton,
  isRunning,
}: ScenarioBuilderProps) {
  const [form, setForm] = useState(defaultForm);
  const [showConfigFormWhenStaged, setShowConfigFormWhenStaged] = useState(false);

  const stageSummary = useMemo(() => computeStageSummary(events), [events]);
  const showConfigForm = events.length === 0 || showConfigFormWhenStaged;

  function toggleCountry(code: CountryCode) {
    setForm((f) => {
      const exists = f.countries.includes(code);
      // Keep at least one country selected
      if (exists && f.countries.length === 1) return f;
      const next = exists
        ? f.countries.filter((c) => c !== code)
        : [...f.countries, code];
      // If destination matches a newly selected origin, clear it
      const dest = next.includes(f.destinationCountry as CountryCode)
        ? undefined
        : f.destinationCountry;
      return { ...f, countries: next, destinationCountry: dest };
    });
  }

  function handleStageMove() {
    if (form.quantity < 1 || form.countries.length === 0) return;
    const salaryUsd = SALARY_BANDS.find((b) => b.value === form.salaryBand)?.usd ?? 100_000;
    form.countries.forEach((country) => {
      const event: ScenarioEvent = {
        id: `${Math.random().toString(36).slice(2, 9)}-${country}`,
        country,
        workerType: form.workerType,
        eventType:  form.eventType,
        jobFunction: form.jobFunction,
        quantity:   form.quantity,
        timingQuarter: form.timingQuarter,
        avgAnnualSalaryUsd: salaryUsd,
        destinationCountry:
          form.eventType === 'relocation' ? form.destinationCountry : undefined,
      };
      onAddEvent(event);
    });
    setForm(defaultForm);
    setShowConfigFormWhenStaged(false);
  }

  const availableDestinations = COUNTRIES.filter((c) => !form.countries.includes(c.code));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
        <h2 className="text-[#F1F5F9] text-sm font-semibold">Scenario Staging</h2>
        <p className="text-[#8899B2] text-xs mt-0.5">Stage workforce moves for analysis</p>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Quick Start ─────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Quick Start</SectionLabel>
          <div className="space-y-1.5">
            {([
              { n: 1 as const, label: '🔄 Convert 12 Contractors',   sub: 'ES + DE · Q3' },
              { n: 2 as const, label: '✈️ Relocate Team US → UK',    sub: 'Q2 · Equity friction' },
              { n: 3 as const, label: '⚠️ Terminate 5 EOR Germany',  sub: 'Q2 · High friction' },
            ]).map(({ n, label, sub }) => (
              <button
                key={n}
                onClick={() => onWowButton(n)}
                className={`w-full text-left rounded-lg border border-[#2D3450] hover:border-[#7B6FD4] bg-[#1A1F35] hover:bg-[#1E2340] px-3 py-2 transition-all group ${btnFocus}`}
              >
                <div className="text-[#EDF0F7] text-xs font-medium group-hover:text-[#C4B5FD] transition-colors leading-tight">
                  {label}
                </div>
                <div className="text-[#8899B2] text-[10px] mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Staged Scenario ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Staged Scenario</SectionLabel>

          {/* Live summary line */}
          {stageSummary && (
            <div className="rounded-lg bg-[#0A0C14] border border-[#2D3450] px-3 py-1.5 mb-2">
              <p className="text-[10px] text-[#A8B4C8] font-mono leading-relaxed">{stageSummary}</p>
            </div>
          )}

          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2D3450] px-3 py-4 text-center">
              <div className="text-[#5A6A85] text-xs">No moves staged yet</div>
              <div className="text-[#3D4A60] text-[10px] mt-0.5">Use Quick Start or configure below</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {events.map((evt) => {
                const color = EVENT_TYPE_COLORS[evt.eventType];
                const moveName = EVENT_TYPES.find((e) => e.value === evt.eventType)?.short ?? evt.eventType;
                return (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-[#2D3450] hover:border-[#7B6FD4]/40 bg-[#1A1F35] hover:bg-[#1C2138] px-3 py-2 flex items-center justify-between gap-2 transition-all"
                    style={{ minHeight: '52px' }}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Top line: move type chip */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-tight flex-shrink-0"
                          style={{ color, background: `${color}20` }}
                        >
                          {moveName}
                        </span>
                        {evt.destinationCountry && (
                          <span className="text-[10px] text-[#8899B2] flex-shrink-0">
                            → {evt.destinationCountry}
                          </span>
                        )}
                      </div>
                      {/* Second line: details */}
                      <div className="text-[10px] text-[#8899B2] truncate">
                        {evt.country}
                        {' · '}{evt.jobFunction}
                        {' · '}{evt.quantity}×
                        {' · '}{evt.timingQuarter}
                        {' · '}{salaryLabel(evt.avgAnnualSalaryUsd)}
                        {' · '}{WORKER_LABELS[evt.workerType]}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveEvent(evt.id)}
                      className="text-[#4A5A75] hover:text-[#FC8181] hover:bg-[#1F1214] text-sm leading-none flex-shrink-0 transition-colors rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FC8181]"
                      aria-label={`Remove ${moveName}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {!showConfigForm && (
                <button
                  onClick={() => {
                    setForm(defaultForm);
                    setShowConfigFormWhenStaged(true);
                  }}
                  className={`text-xs text-[#C4B5FD] hover:text-[#D4C5FD] transition-colors pt-1 ${btnFocus}`}
                >
                  + Add another move
                </button>
              )}
            </div>
          )}
        </div>

        {showConfigForm && (
          <>
            <div className="border-t border-[#1E2235]" />

            {/* ── Strategic Move ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel>Strategic Move</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {EVENT_TYPES.map((et) => {
                  const isActive = form.eventType === et.value;
                  const color    = EVENT_TYPE_COLORS[et.value];
                  return (
                    <button
                      key={et.value}
                      onClick={() => setForm((f) => ({ ...f, eventType: et.value }))}
                      className={`rounded-lg px-2.5 py-2.5 text-left transition-all border ${btnFocus}`}
                      style={
                        isActive
                          ? { borderColor: `${color}55`, background: `${color}14` }
                          : { borderColor: '#2D3450', background: '#141829' }
                      }
                    >
                      <div
                        className="text-xs font-semibold leading-tight"
                        style={{ color: isActive ? color : '#A8B4C8' }}
                      >
                        {et.short}
                      </div>
                      <div className="text-[9px] text-[#5A6A85] mt-0.5 leading-tight">{et.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Target Profile ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel>Target Profile</SectionLabel>
              <div className="space-y-3">

            {/* Countries — multi-select pills */}
            <div>
              <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Countries</div>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map((c) => {
                  const active = form.countries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all border ${btnFocus} ${
                        active
                          ? 'border-[#7B6FD4]/60 bg-[#7B6FD4]/15 text-[#C4B5FD]'
                          : 'border-[#2D3450] bg-[#141829] text-[#8899B2] hover:border-[#7B6FD4]/30 hover:text-[#A8B4C8]'
                      }`}
                      aria-pressed={active}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination country (relocation only) */}
            {form.eventType === 'relocation' && (
              <div>
                <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Destination Country</div>
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
                  {availableDestinations.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Worker Type + Job Function */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Worker Type</div>
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
              <div>
                <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Job Function</div>
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
            </div>

            {/* Salary Band — dropdown */}
            <div>
              <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Salary Band</div>
              <select
                className={inputClass}
                value={form.salaryBand}
                onChange={(e) => setForm((f) => ({ ...f, salaryBand: e.target.value as SalaryBand }))}
              >
                {SALARY_BANDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
              </div>
            </div>

            {/* ── Execution Plan ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel>Execution Plan</SectionLabel>
              <div className="space-y-3">

            {/* Quantity stepper */}
            <div>
              <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Quantity</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className={`w-8 h-8 rounded-lg border border-[#2D3450] bg-[#141829] text-[#A8B4C8] hover:border-[#7B6FD4] hover:text-[#C4B5FD] text-lg font-bold transition-all flex items-center justify-center leading-none ${btnFocus}`}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[#EDF0F7] text-xl font-bold tabular-nums">{form.quantity}</span>
                  <span className="text-[#8899B2] text-[10px] ml-1.5">
                    worker{form.quantity !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: Math.min(200, f.quantity + 1) }))}
                  className={`w-8 h-8 rounded-lg border border-[#2D3450] bg-[#141829] text-[#A8B4C8] hover:border-[#7B6FD4] hover:text-[#C4B5FD] text-lg font-bold transition-all flex items-center justify-center leading-none ${btnFocus}`}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Timing quarter — pill selector */}
            <div>
              <div className="text-[#A8B4C8] text-[10px] font-medium mb-1.5">Timing Quarter</div>
              <div className="flex gap-1.5">
                {QUARTERS.map((q) => {
                  const active = form.timingQuarter === q;
                  return (
                    <button
                      key={q}
                      onClick={() => setForm((f) => ({ ...f, timingQuarter: q }))}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all border ${btnFocus} ${
                        active
                          ? 'border-[#7B6FD4]/60 bg-[#7B6FD4]/15 text-[#C4B5FD]'
                          : 'border-[#2D3450] bg-[#141829] text-[#8899B2] hover:border-[#7B6FD4]/30 hover:text-[#A8B4C8]'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>
              </div>
            </div>

            {/* Stage Move CTA */}
            <button
              onClick={handleStageMove}
              disabled={form.countries.length === 0 || form.quantity < 1}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnFocus}`}
              style={{
                background: 'linear-gradient(135deg, #7B6FD4 0%, #5F54B0 100%)',
                color: 'white',
              }}
            >
              Stage Move →
            </button>
          </>
        )}

      </div>

      {/* ── Fixed footer: Run Impact Analysis ────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[#2D3450] flex-shrink-0">
        <button
          onClick={onRunSimulation}
          disabled={events.length === 0 || isRunning}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnFocus}`}
          style={{
            background:
              events.length > 0
                ? 'linear-gradient(135deg, #6B5FC4 0%, #4A3FA0 100%)'
                : '#141829',
            color: events.length > 0 ? 'white' : '#5A6A85',
          }}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running threshold checks...
            </span>
          ) : events.length > 0 ? (
            `Run Impact Analysis → (${events.length} move${events.length !== 1 ? 's' : ''})`
          ) : (
            'Stage a move to begin'
          )}
        </button>
      </div>
    </div>
  );
}
