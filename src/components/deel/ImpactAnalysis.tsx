'use client';

import React, { useState } from 'react';
import type { ScenarioEvaluation, OFSWeights, ExecBrief } from '@/engine/types';
import SignalCard from './SignalCard';
import OFSHero from './WFSHero';
import RiskHeatmap from './RiskHeatmap';
import WorkflowSteps from './WorkflowSteps';

interface ImpactAnalysisProps {
  evaluation: ScenarioEvaluation | null;
  evalB: ScenarioEvaluation | null;
  isCompare: boolean;
  activeView: 'executive' | 'operator';
  onViewChange: (view: 'executive' | 'operator') => void;
  weights: OFSWeights;
  onWeightChange: (key: keyof OFSWeights, value: number) => void;
  liveOFS: number | null;
  onApplySequencing: () => void;
  execBrief: ExecBrief | null;
  isBriefLoading: boolean;
  onOpenExplainability: (policyIds?: string[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function pcrColor(pcr: string): 'red' | 'yellow' | 'green' {
  if (pcr === 'High') return 'red';
  if (pcr === 'Medium') return 'yellow';
  return 'green';
}

function deltaColor(delta: number): string {
  if (delta < 0) return '#4ADE9A';  // improvement
  if (delta > 0) return '#FC8181';  // worsened
  return '#A8B4C8';
}

function deltaPrefix(delta: number): string {
  return delta > 0 ? '+' : '';
}

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

// Maps threshold IDs (by prefix pattern) to related trigger families for "Why?" button
function getRelatedPolicyIds(thresholdId: string, triggers: ScenarioEvaluation['triggers']): string[] {
  const id = thresholdId.toLowerCase();
  const filtered = triggers.filter((t) => {
    const pid = t.policyId.toLowerCase();
    if (id.includes('pe') || id.includes('tax') || id.includes('presence')) {
      return pid.startsWith('pe') || t.family.toLowerCase().includes('presence');
    }
    if (id.includes('mc') || id.includes('mis') || id.includes('employ') || id.includes('ese')) {
      return pid.startsWith('mc') || t.family.toLowerCase().includes('misclass');
    }
    if (id.includes('gov') || id.includes('workflow')) {
      return pid.startsWith('gov') || t.family.toLowerCase().includes('governance');
    }
    if (id.includes('term') || id.includes('trm')) {
      return pid.startsWith('trm') || t.family.toLowerCase().includes('terminat');
    }
    if (id.includes('rel') || id.includes('visa')) {
      return pid.startsWith('rel') || t.family.toLowerCase().includes('relocat');
    }
    return false;
  });
  if (filtered.length) return filtered.map((t) => t.policyId);
  // Fallback: all CRITICAL or HIGH triggers
  return triggers.filter((t) => t.severity === 'CRITICAL' || t.severity === 'HIGH').map((t) => t.policyId);
}

// ── Weight Sliders ─────────────────────────────────────────────────────────────

interface WeightSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}

function WeightSlider({ label, description, value, onChange, color }: WeightSliderProps) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#A8B4C8]">{label}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <input
        type="range"
        min={5}
        max={85}
        step={1}
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #252B45 ${pct}%, #252B45 100%)`,
          accentColor: color,
        }}
        aria-label={`${label} weight: ${pct}%`}
      />
      <div className="text-[10px] text-[#8899B2] mt-0.5">{description}</div>
    </div>
  );
}

// ── Input Confidence Meter ─────────────────────────────────────────────────────

function InputConfidenceMeter({ score }: { score: number }) {
  const color = score >= 80 ? '#4ADE9A' : score >= 60 ? '#FCD34D' : '#FC8181';
  const label = score >= 80 ? 'High Confidence' : score >= 60 ? 'Moderate Confidence' : 'Low Confidence';
  return (
    <div className="rounded-lg bg-[#1A1F35] border border-[#2D3450] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
          Input Completeness
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {score}% · {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#252B45] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      {score < 70 && (
        <div className="text-[10px] text-[#FCD34D] mt-1.5">
          ↑ Confidence penalty applied to OFS — add more event details to reduce uncertainty
        </div>
      )}
    </div>
  );
}

// ── Model Scope Panel ──────────────────────────────────────────────────────────

function ModelScopePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#2D3450] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-[#1A1F35] hover:bg-[#1E2340] transition-colors text-left ${btnFocus}`}
        aria-expanded={open}
      >
        <span className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
          Model Scope & Limitations
        </span>
        <span className="text-[#8899B2] text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-[#111827] grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[#4ADE9A] text-[10px] uppercase tracking-wider font-medium mb-2">
              ✓ Modeled
            </div>
            <ul className="space-y-1 text-[#A8B4C8]">
              <li>· Tax Presence Exposure (indicative)</li>
              <li>· Employment Status Exposure (indicative)</li>
              <li>· Governance & workflow load</li>
              <li>· Execution cluster risk</li>
              <li>· Payroll cycle risk (PCR)</li>
              <li>· Liability tail estimate</li>
              <li>· Event sequencing risk</li>
            </ul>
          </div>
          <div>
            <div className="text-[#FC8181] text-[10px] uppercase tracking-wider font-medium mb-2">
              ✗ Not modeled
            </div>
            <ul className="space-y-1 text-[#8899B2]">
              <li>· Tax filing obligations</li>
              <li>· Employment contract drafting</li>
              <li>· Visa/immigration advice</li>
              <li>· HR policy implementation</li>
              <li>· Social security treaties</li>
              <li>· Currency/FX risk</li>
              <li>· Legal entity strategy</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compare Delta Cards ────────────────────────────────────────────────────────

interface DeltaCardProps {
  label: string;
  currentVal: string | number;
  optimizedVal: string | number;
  delta: number;
  unit?: string;
}

function DeltaCard({ label, currentVal, optimizedVal, delta, unit = '' }: DeltaCardProps) {
  const color = deltaColor(delta);
  return (
    <div className="rounded-lg bg-[#1A1F35] border border-[#2D3450] px-3 py-2.5">
      <div className="text-[10px] text-[#8899B2] uppercase tracking-wider font-medium mb-1.5">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] text-[#8899B2]">Current</div>
          <div className="text-sm font-semibold text-[#EDF0F7]">{currentVal}{unit}</div>
        </div>
        <div className="text-[#2D3450]">→</div>
        <div>
          <div className="text-[10px] text-[#8899B2]">Optimized</div>
          <div className="text-sm font-semibold text-[#EDF0F7]">{optimizedVal}{unit}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#8899B2]">Δ</div>
          <div className="text-sm font-bold" style={{ color }}>
            {deltaPrefix(delta)}{delta}{unit}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OFS Formula Table ──────────────────────────────────────────────────────────

function OFSFormulaTable({ evaluation, liveOFS }: { evaluation: ScenarioEvaluation; liveOFS: number | null }) {
  const cs = evaluation.componentScores;
  const w = evaluation.weights;
  const displayOFS = liveOFS ?? evaluation.signals.ofs;

  const rows = [
    { label: 'Tax Presence & Employment Exposure', score: cs.exposureScore, weight: w.exposure, color: '#FC8181' },
    { label: 'Governance Load', score: cs.governanceLoad, weight: w.governance, color: '#FB923C' },
    { label: 'Execution Cluster Risk', score: cs.executionClusterRisk, weight: w.speed, color: '#FCD34D' },
    { label: 'Confidence Penalty', score: cs.confidencePenalty, weight: w.confidence, color: '#7DD3FC' },
  ];

  return (
    <div className="rounded-xl border border-[#2D3450] overflow-hidden">
      <div className="px-4 py-2.5 bg-[#1A1F35] border-b border-[#2D3450]">
        <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
          OFS Formula Breakdown
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#2D3450]">
            <th className="text-left px-4 py-2 text-[10px] text-[#8899B2] uppercase tracking-wider font-medium">Component</th>
            <th className="text-center px-2 py-2 text-[10px] text-[#8899B2] uppercase tracking-wider font-medium">Score</th>
            <th className="text-center px-2 py-2 text-[10px] text-[#8899B2] uppercase tracking-wider font-medium">Weight</th>
            <th className="text-right px-4 py-2 text-[10px] text-[#8899B2] uppercase tracking-wider font-medium">Contrib.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#2D3450]/50">
              <td className="px-4 py-2" style={{ color: row.color }}>{row.label}</td>
              <td className="px-2 py-2 text-center text-[#EDF0F7] tabular-nums font-mono">{Math.round(row.score)}</td>
              <td className="px-2 py-2 text-center text-[#A8B4C8] tabular-nums font-mono">×{row.weight.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-bold tabular-nums" style={{ color: row.color }}>
                {(row.score * row.weight).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#1A1F35]">
            <td colSpan={3} className="px-4 py-2.5 text-[#EDF0F7] font-semibold text-xs">
              Operational Friction Score (OFS)
            </td>
            <td className="px-4 py-2.5 text-right font-bold text-base text-[#C4B5FD] tabular-nums">
              {Math.round(displayOFS)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Executive Brief Display ────────────────────────────────────────────────────

const DRIVER_COLORS: Record<string, string> = {
  Exposure: '#FC8181',
  Governance: '#FB923C',
  Execution: '#FCD34D',
  Confidence: '#7DD3FC',
};

function ExecBriefDisplay({ brief, isLoading }: { brief: ExecBrief | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
            Decision Assistant
          </span>
          <span className="inline-block w-1.5 h-1.5 bg-[#7B6FD4] rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#252B45] rounded animate-pulse" />
          <div className="h-3 bg-[#252B45] rounded animate-pulse w-4/5" />
          <div className="h-3 bg-[#252B45] rounded animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-4 text-center">
        <div className="text-[#8899B2] text-xs">
          Executive brief will appear here after previewing impact
        </div>
      </div>
    );
  }

  const driverColor = DRIVER_COLORS[brief.dominantDriver] ?? '#A8B4C8';

  return (
    <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
          Decision Assistant
        </span>
        {brief.dominantDriver && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ color: driverColor, background: `${driverColor}18`, border: `1px solid ${driverColor}30` }}
          >
            {brief.dominantDriver} Driver
          </span>
        )}
      </div>

      {/* Exec brief */}
      <p className="text-[#EDF0F7] text-xs leading-relaxed">{brief.execBrief}</p>

      {/* Tradeoff */}
      {brief.tradeoffIdentified && (
        <div className="rounded-lg border border-[#FCD34D]/25 bg-[#1D1A0F] px-3 py-2">
          <div className="text-[10px] text-[#FCD34D] uppercase tracking-wider font-medium mb-1">Tradeoff</div>
          <p className="text-[#EDF0F7] text-xs leading-relaxed">{brief.tradeoffIdentified}</p>
        </div>
      )}

      {/* Input confidence */}
      <div className="flex items-center gap-2 text-xs text-[#A8B4C8]">
        <span>Input confidence:</span>
        <span className="font-semibold text-[#EDF0F7]">{Math.round(brief.inputConfidence)}%</span>
      </div>

      {/* Data required */}
      {brief.dataRequired?.length > 0 && (
        <div>
          <div className="text-[10px] text-[#FCD34D] uppercase tracking-wider font-medium mb-1">
            Data Gaps
          </div>
          <ul className="space-y-0.5">
            {brief.dataRequired.map((d, i) => (
              <li key={i} className="text-[#A8B4C8] text-xs flex items-start gap-1.5">
                <span className="text-[#FCD34D] flex-shrink-0 mt-0.5">·</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ImpactAnalysis({
  evaluation,
  evalB,
  isCompare,
  activeView,
  onViewChange,
  weights,
  onWeightChange,
  liveOFS,
  onApplySequencing,
  execBrief,
  isBriefLoading,
  onOpenExplainability,
}: ImpactAnalysisProps) {

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!evaluation) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
          <h2 className="text-[#F1F5F9] text-sm font-semibold">Impact Analysis</h2>
          <p className="text-[#8899B2] text-xs mt-0.5">Signals, heatmap &amp; workflow</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="text-4xl mb-4 opacity-20">⚡</div>
            <h3 className="text-[#A8B4C8] text-base font-medium mb-2">No impact data yet</h3>
            <p className="text-[#8899B2] text-sm leading-relaxed">
              Add events to the Scenario Builder and click{' '}
              <span className="text-[#C4B5FD]">Preview Impact</span> to see workforce analysis.
            </p>
            <p className="text-[#8899B2] text-xs mt-3">
              Or use a Quick Scenario to auto-load a preset.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const s = evaluation.signals;
  const breachedCount = evaluation.thresholdBreaches.filter((b) => b.breached).length;
  const displayOFS = liveOFS ?? s.ofs;

  // Derived compare deltas
  const ofsDelta = evalB ? Math.round(evalB.signals.ofs) - Math.round(s.ofs) : 0;
  const costDelta = evalB ? Math.round((evalB.signals.totalCostImpact - s.totalCostImpact) / 1000) : 0;
  const govDelta = evalB ? Math.round(evalB.signals.governanceLoad) - Math.round(s.governanceLoad) : 0;
  const exDelta = evalB ? Math.round(evalB.signals.executionClusterRisk) - Math.round(s.executionClusterRisk) : 0;

  // ── Recommended sequencing section ────────────────────────────────────────
  const hasSequencing = execBrief?.recommendedSequencing && execBrief.recommendedSequencing.length > 0;

  // ── View toggle ────────────────────────────────────────────────────────────
  const viewToggle = (
    <div className="flex bg-[#1A1F35] border border-[#2D3450] rounded-lg p-0.5">
      {(['executive', 'operator'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={`flex-1 rounded-md text-xs font-medium px-3 py-1.5 transition-all capitalize ${btnFocus} ${
            activeView === v
              ? 'bg-[#7B6FD4] text-white shadow-sm'
              : 'text-[#8899B2] hover:text-[#A8B4C8]'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  EXECUTIVE VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (activeView === 'executive') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[#F1F5F9] text-sm font-semibold">Impact Analysis</h2>
              <p className="text-[#8899B2] text-xs mt-0.5 truncate">{evaluation.summary.slice(0, 70)}…</p>
            </div>
            <div className="flex-shrink-0">{viewToggle}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* OFS Hero */}
          <OFSHero
            ofs={displayOFS}
            gli={s.gli}
            componentScores={evaluation.componentScores}
          />

          {/* Compare delta cards */}
          {isCompare && evalB && (
            <div>
              <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
                Scenario A vs B · Current → Optimized Staging
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DeltaCard
                  label="OFS"
                  currentVal={Math.round(s.ofs)}
                  optimizedVal={Math.round(evalB.signals.ofs)}
                  delta={ofsDelta}
                />
                <DeltaCard
                  label="Cost Impact"
                  currentVal={formatUSD(s.totalCostImpact)}
                  optimizedVal={formatUSD(evalB.signals.totalCostImpact)}
                  delta={costDelta}
                  unit="K"
                />
                <DeltaCard
                  label="Governance Load"
                  currentVal={Math.round(s.governanceLoad)}
                  optimizedVal={Math.round(evalB.signals.governanceLoad)}
                  delta={govDelta}
                />
                <DeltaCard
                  label="Execution Risk"
                  currentVal={Math.round(s.executionClusterRisk)}
                  optimizedVal={Math.round(evalB.signals.executionClusterRisk)}
                  delta={exDelta}
                />
              </div>
            </div>
          )}

          {/* Key signal cards */}
          <div className="grid grid-cols-3 gap-2">
            <SignalCard
              label="Cost Impact"
              value={formatUSD(s.totalCostImpact)}
              sub="Modeled · all events"
              accent="purple"
              modeled
            />
            <SignalCard
              label="Tax Presence"
              value={`${Math.round(s.exposureScore)}`}
              sub="Exposure score /100"
              accent={s.exposureScore >= 70 ? 'red' : s.exposureScore >= 40 ? 'yellow' : 'green'}
              tooltip="Tax Presence Exposure: indicative risk of triggering permanent establishment. Modeled only — not legal advice."
            />
            <SignalCard
              label="Gov. Load"
              value={`${Math.round(s.governanceLoad)}`}
              sub="Governance index /100"
              accent={s.governanceLoad >= 70 ? 'red' : s.governanceLoad >= 40 ? 'yellow' : 'green'}
              tooltip="Governance Load: volume × complexity of policies and approvals required across countries in scope."
            />
          </div>

          {/* Decision Priorities (Weight Sliders) */}
          <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-4 space-y-3">
            <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
              Decision Priorities · Weights sum to 100%
            </div>
            <WeightSlider
              label="Exposure Sensitivity"
              description="Tax presence + employment status exposure"
              value={weights.exposure}
              onChange={(v) => onWeightChange('exposure', v)}
              color="#FC8181"
            />
            <WeightSlider
              label="Governance Sensitivity"
              description="Regulatory burden + policy complexity"
              value={weights.governance}
              onChange={(v) => onWeightChange('governance', v)}
              color="#FB923C"
            />
            <WeightSlider
              label="Speed Sensitivity"
              description="Execution cluster + sequencing risk"
              value={weights.speed}
              onChange={(v) => onWeightChange('speed', v)}
              color="#FCD34D"
            />
            <WeightSlider
              label="Confidence Penalty"
              description="Applies when input data is incomplete"
              value={weights.confidence}
              onChange={(v) => onWeightChange('confidence', v)}
              color="#7DD3FC"
            />
            <div className="text-[10px] text-[#8899B2] italic">
              OFS updates live · Rerun engine to reflect in heatmap &amp; triggers
            </div>
          </div>

          {/* Input completeness */}
          <InputConfidenceMeter score={evaluation.componentScores.inputCompletenessScore} />

          {/* Executive brief */}
          <ExecBriefDisplay brief={execBrief} isLoading={isBriefLoading} />

          {/* Recommended sequencing + Apply */}
          {hasSequencing && (
            <div className="rounded-xl border border-[#C4B5FD]/25 bg-[#14122A] px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium">
                  Recommended Sequencing
                </div>
                <button
                  onClick={onApplySequencing}
                  className={`text-[10px] font-medium rounded-lg px-3 py-1.5 transition-all bg-[#7B6FD4] hover:bg-[#8B7FE0] text-white ${btnFocus}`}
                >
                  Apply &amp; Re-run →
                </button>
              </div>
              <ol className="space-y-1">
                {execBrief!.recommendedSequencing.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#A8B4C8] leading-relaxed">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1A1F35] text-[#C4B5FD] text-[9px] flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Model scope */}
          <ModelScopePanel />

          {/* Disclaimer */}
          <div className="text-center text-[#8899B2] text-[10px] pb-2">
            Demo model · Illustrative policies · Not legal advice
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  OPERATOR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[#F1F5F9] text-sm font-semibold">Impact Analysis</h2>
            <p className="text-[#8899B2] text-xs mt-0.5">Operator view · Raw signals &amp; policy detail</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {viewToggle}
            <button
              onClick={() => onOpenExplainability()}
              className={`text-xs text-[#C4B5FD] hover:text-[#D4C5FD] border border-[#7B6FD4]/40 hover:border-[#7B6FD4] rounded-lg px-3 py-1.5 transition-all ${btnFocus}`}
            >
              Explain Why →
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Full signal grid */}
        <div>
          <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
            All Signals
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SignalCard
              label="Total Cost Impact"
              value={formatUSD(s.totalCostImpact)}
              sub="Modeled · all events"
              accent="purple"
              modeled
            />
            <SignalCard
              label="Headcount Delta"
              value={s.headcountDelta >= 0 ? `+${s.headcountDelta}` : `${s.headcountDelta}`}
              sub="Net employed FTE change"
              accent={s.headcountDelta >= 0 ? 'green' : 'red'}
            />
            <SignalCard
              label="Risk Clusters"
              value={s.riskClusterCount}
              sub="High/Critical policy triggers"
              accent={s.riskClusterCount > 3 ? 'red' : s.riskClusterCount > 1 ? 'yellow' : 'green'}
            />
            <SignalCard
              label="Visa Load"
              value={s.visaLoad}
              sub="Workers requiring visa/RTW"
              accent={s.visaLoad > 5 ? 'orange' : s.visaLoad > 0 ? 'yellow' : 'neutral'}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <SignalCard
              label="PCR"
              value={s.pcr}
              sub="Payroll cycle clustering"
              accent={pcrColor(s.pcr)}
            />
            <SignalCard
              label="Liability Tail"
              value={formatUSD(s.liabilityTail)}
              sub="Benefits continuation"
              accent="orange"
              modeled
            />
            <SignalCard
              label="Thresholds"
              value={`${breachedCount} / ${evaluation.thresholdBreaches.length}`}
              sub="Breached thresholds"
              accent={breachedCount > 2 ? 'red' : breachedCount > 0 ? 'yellow' : 'green'}
            />
          </div>
        </div>

        {/* OFS Formula Breakdown */}
        <OFSFormulaTable evaluation={evaluation} liveOFS={liveOFS} />

        {/* Risk Heatmap */}
        <div>
          <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
            Risk Heatmap · Score 0–100
          </div>
          <RiskHeatmap cells={evaluation.heatmap} />
        </div>

        {/* Threshold breaches */}
        {breachedCount > 0 && (
          <div>
            <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
              Threshold Breaches
            </div>
            <div className="space-y-1.5">
              {evaluation.thresholdBreaches
                .filter((b) => b.breached)
                .map((b) => (
                  <div
                    key={`${b.thresholdId}-${b.country ?? 'global'}`}
                    className="rounded-lg border border-[#FC8181]/25 bg-[#1F1214] px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#FC8181] font-medium leading-tight">{b.label}</div>
                      <div className="text-[10px] text-[#8899B2] mt-0.5">{b.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs tabular-nums text-[#FC8181] font-bold">
                          {b.current} / {b.threshold}
                        </div>
                        <div className="text-[10px] text-[#8899B2]">current / limit</div>
                      </div>
                      <button
                        onClick={() => onOpenExplainability(getRelatedPolicyIds(b.thresholdId, evaluation.triggers))}
                        className={`text-[10px] text-[#C4B5FD] hover:text-[#D4C5FD] border border-[#7B6FD4]/30 hover:border-[#7B6FD4] rounded px-2 py-1 transition-all ${btnFocus}`}
                        aria-label={`Explain why threshold ${b.label} is breached`}
                      >
                        Why?
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Workflow steps */}
        <div>
          <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
            Required Workflow
          </div>
          <WorkflowSteps steps={evaluation.workflow} />
        </div>

        {/* Staging suggestion */}
        {evaluation.stagingSuggestion && (
          <div className="rounded-xl border border-[#C4B5FD]/25 bg-[#14122A] px-4 py-3">
            <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium mb-1.5">
              Staging Suggestion
            </div>
            <p className="text-[#A8B4C8] text-xs leading-relaxed">{evaluation.stagingSuggestion}</p>
          </div>
        )}

        {/* Data gaps */}
        {evaluation.dataGaps.length > 0 && (
          <div className="rounded-xl border border-[#FCD34D]/20 bg-[#1D1A0F] px-4 py-3">
            <div className="text-[10px] text-[#FCD34D] uppercase tracking-wider font-medium mb-2">
              Data Gaps · {evaluation.dataGaps.length}
            </div>
            <ul className="space-y-1">
              {evaluation.dataGaps.map((gap, i) => (
                <li key={i} className="text-[#FCD34D] text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-[#FCD34D]/60 flex-shrink-0 mt-0.5">·</span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center text-[#8899B2] text-[10px] pb-2">
          Demo model · Illustrative policies · Not legal advice · Policy IDs are fictional identifiers
        </div>
      </div>
    </div>
  );
}
