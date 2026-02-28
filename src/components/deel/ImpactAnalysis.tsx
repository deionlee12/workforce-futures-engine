'use client';

import React, { useEffect, useState } from 'react';
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
  weights: OFSWeights;
  onWeightChange: (key: keyof OFSWeights, value: number) => void;
  liveOFS: number | null;
  onApplySequencing: () => void;
  execBrief: ExecBrief | null;
  isBriefLoading: boolean;
  onOpenExplainability: (policyIds?: string[]) => void;
  canRevertSequencing?: boolean;
  onRevertSequencing?: () => void;
  lastOFSChange?: { before: number; after: number } | null;
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

function formatSignalNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
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

function getSequencingReasons(evaluation: ScenarioEvaluation): string[] {
  const breached = evaluation.thresholdBreaches.filter((b) => b.breached);
  const reasons: string[] = [];

  const peBreached = breached.some((b) => b.thresholdId === 'pe_worker_count');
  const misclassTrigger = evaluation.triggers.some((t) => t.policyId.includes('MC'));
  const clusteredExecution = evaluation.signals.executionClusterRisk >= 55 || evaluation.signals.pcr === 'High';

  if (peBreached) reasons.push('Defers conversion until entity readiness is validated');
  if (misclassTrigger) reasons.push('Reduces Employment Status Exposure before conversion wave');
  if (clusteredExecution) reasons.push('Reduces parallel threshold breach risk during transition');
  if (reasons.length === 0) reasons.push('Minimizes sequencing friction across policy workflow dependencies');

  return reasons.slice(0, 3);
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
  const ratio = pct / 100;
  const fillStop = pct <= 0
    ? '0px'
    : pct >= 100
    ? '100%'
    : `calc(${pct}% + ${(6 - 12 * ratio).toFixed(2)}px)`;
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
        className="wfs-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          ['--wfs-slider-color' as string]: color,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${fillStop}, #252B45 ${fillStop}, #252B45 100%)`,
        }}
        aria-label={`${label} weight: ${pct}%`}
      />
      <div className="text-[10px] text-[#8899B2] mt-0.5">{description}</div>
    </div>
  );
}

function DecisionPrioritiesPanel({
  weights,
  onWeightChange,
}: {
  weights: OFSWeights;
  onWeightChange: (key: keyof OFSWeights, value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-4 space-y-3">
      <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
        Decision Priorities · Weights sum to 100%
      </div>
      <WeightSlider
        label="Exposure Sensitivity"
        description="Tax Presence Exposure + employment status exposure"
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
        WFS updates live · Rerun engine to reflect in heatmap &amp; triggers
      </div>
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
          ↑ Confidence penalty applied to WFS — add more event details to reduce uncertainty
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
  const isNeutral = delta === 0;
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
          <div className="text-base font-extrabold tabular-nums" style={{ color }}>
            {isNeutral ? 'No material change' : `${deltaPrefix(delta)}${delta}${unit}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowTimeline({ steps }: { steps: ScenarioEvaluation['workflow'] }) {
  if (steps.length === 0) return null;

  const nodes = steps.map((step, index) => {
    const cumulativeDays = steps
      .slice(0, index + 1)
      .reduce((totalDays, item) => totalDays + item.daysRequired, 0);
    return {
      stepId: step.stepId,
      title: step.title,
      dayMarker: `D+${cumulativeDays}`,
    };
  });

  return (
    <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-3 py-3">
      <div className="flex items-start">
        {nodes.map((node, idx) => (
          <React.Fragment key={node.stepId}>
            <div className="flex-1 min-w-0">
              <div className="flex justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD] shadow-[0_0_8px_rgba(196,181,253,0.45)]" />
              </div>
              <div className="mt-2 text-center px-1">
                <div className="text-[10px] text-[#A8B4C8] leading-tight overflow-hidden text-ellipsis whitespace-nowrap sm:whitespace-normal">
                  {node.title}
                </div>
                <div className="text-[10px] text-[#8899B2] mt-0.5">{node.dayMarker}</div>
              </div>
            </div>
            {idx < nodes.length - 1 && (
              <div className="flex-1 pt-[5px]">
                <div className="h-px bg-[#2D3450]" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── WFS Formula Table ──────────────────────────────────────────────────────────

function OFSFormulaTable({ evaluation, liveOFS }: { evaluation: ScenarioEvaluation; liveOFS: number | null }) {
  const cs = evaluation.componentScores;
  const w = evaluation.weights;
  const displayOFS = liveOFS ?? evaluation.signals.ofs;

  const rows = [
    { label: 'Tax + Employment Exposure', score: cs.exposureScore, weight: w.exposure, color: '#FC8181' },
    { label: 'Governance Load', score: cs.governanceLoad, weight: w.governance, color: '#FB923C' },
    { label: 'Execution Cluster Risk', score: cs.executionClusterRisk, weight: w.speed, color: '#FCD34D' },
    { label: 'Confidence Penalty', score: cs.confidencePenalty, weight: w.confidence, color: '#7DD3FC' },
  ];

  return (
    <div className="rounded-xl border border-[#2D3450] overflow-hidden">
      <div className="px-4 py-2.5 bg-[#1A1F35] border-b border-[#2D3450]">
        <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
          WFS Formula Breakdown
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
              Workforce Friction Score (WFS)
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ImpactAnalysis({
  evaluation,
  evalB,
  isCompare,
  activeView,
  weights,
  onWeightChange,
  liveOFS,
  onApplySequencing,
  // execBrief, isBriefLoading — accepted by interface but intentionally rendered in right rail
  onOpenExplainability,
  canRevertSequencing = false,
  onRevertSequencing,
  lastOFSChange = null,
}: ImpactAnalysisProps) {
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportActionState, setExportActionState] = useState<'idle' | 'downloading' | 'copied'>('idle');
  const [decisionLogTimestamp] = useState(() => new Date().toLocaleString());
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteEntries, setNoteEntries] = useState<string[]>([]);
  const [actionEntries, setActionEntries] = useState<string[]>([]);
  const [showSequencingWhy, setShowSequencingWhy] = useState(false);
  const [showSequencingConfirm, setShowSequencingConfirm] = useState(false);
  const [sequencingToast, setSequencingToast] = useState(false);
  const technicalDetailPanelId = 'operator-technical-detail';

  useEffect(() => {
    if (exportActionState === 'idle') return;
    const timeout = window.setTimeout(() => setExportActionState('idle'), 1500);
    return () => window.clearTimeout(timeout);
  }, [exportActionState]);

  useEffect(() => {
    if (!sequencingToast) return;
    const timeout = window.setTimeout(() => setSequencingToast(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [sequencingToast]);

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
              Stage moves in the left panel, then click{' '}
              <span className="text-[#C4B5FD]">Run Impact Analysis</span> to see workforce analysis.
            </p>
            <p className="text-[#8899B2] text-xs mt-3">
              Or use a Quick Start preset to auto-load a scenario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const s = evaluation.signals;
  const breachedCount = evaluation.thresholdBreaches.filter((b) => b.breached).length;
  const displayOFS = liveOFS ?? s.ofs;
  const displayWFS = Math.round(displayOFS);
  const currentExposure = Math.round(s.exposureScore);
  const currentBreaches = breachedCount;
  const currentWFS = displayWFS;
  const recommendedExposure = Math.round(currentExposure * 0.72);
  const recommendedBreaches = Math.max(0, currentBreaches - 2);
  const recommendedWFS = Math.max(0, currentWFS - 7);
  const reducedBreaches = currentBreaches - recommendedBreaches;
  const sequencingReasons = getSequencingReasons(evaluation);
  const ofsChangeTone = lastOFSChange
    ? lastOFSChange.after < lastOFSChange.before
      ? 'improved'
      : lastOFSChange.after > lastOFSChange.before
      ? 'worsened'
      : 'neutral'
    : null;

  // Derived compare deltas
  const ofsDelta = evalB ? Math.round(evalB.signals.ofs) - Math.round(s.ofs) : 0;
  const costDelta = evalB ? Math.round((evalB.signals.totalCostImpact - s.totalCostImpact) / 1000) : 0;
  const govDelta = evalB ? Math.round(evalB.signals.governanceLoad) - Math.round(s.governanceLoad) : 0;
  const exDelta = evalB ? Math.round(evalB.signals.executionClusterRisk) - Math.round(s.executionClusterRisk) : 0;

  function handleSaveNote() {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    const timestamp = new Date().toLocaleString();
    setNoteEntries((prev) => [...prev, `Note added by You · ${timestamp} · ${trimmed}`]);
    setNoteDraft('');
    setIsNoteComposerOpen(false);
  }

  function appendDecisionActionEntry(actionType: 'ACCEPT_APPLY' | 'ACCEPT_LOG_ONLY' | 'DECLINE', rationale: string) {
    const timestamp = new Date().toLocaleString();
    setActionEntries((prev) => [
      ...prev,
      `${timestamp} · ${actionType} · WFS ${displayWFS} · ${rationale}`,
    ]);
  }

  function handleSequencingDecision(actionType: 'ACCEPT_APPLY' | 'ACCEPT_LOG_ONLY' | 'DECLINE') {
    const rationale = sequencingReasons[0] ?? 'Deterministic sequencing rationale';
    appendDecisionActionEntry(actionType, rationale);
    setShowSequencingConfirm(false);
    if (actionType === 'ACCEPT_APPLY') {
      onApplySequencing();
      setSequencingToast(true);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EXECUTIVE VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (activeView === 'executive') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-[#F1F5F9] text-sm font-semibold">Impact Analysis</h2>
            <p className="text-[#8899B2] text-xs mt-0.5">Signals only · Executive view</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {lastOFSChange && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs transition-opacity duration-300 opacity-100 ${
                ofsChangeTone === 'improved'
                  ? 'border-[#4ADE9A]/40 bg-[#0F1A17] text-[#86EFAC]'
                  : ofsChangeTone === 'worsened'
                  ? 'border-[#FC8181]/40 bg-[#1F1214] text-[#FCA5A5]'
                  : 'border-[#2D3450] bg-[#1A1F35] text-[#A8B4C8]'
              }`}
            >
              Scenario updated · WFS {Math.round(lastOFSChange.before)} → {Math.round(lastOFSChange.after)}
            </div>
          )}

          {/* WFS Hero */}
          <OFSHero
            ofs={displayOFS}
            gli={s.gli}
            componentScores={evaluation.componentScores}
          />

          {/* Executive actions */}
          <section className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowWorkflowPanel(true);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all ${btnFocus}`}
                style={{ background: 'linear-gradient(135deg, #7B6FD4 0%, #5F54B0 100%)' }}
              >
                Initiate Readiness Workflow →
              </button>
              <button
                onClick={() => setShowExportPanel((prev) => !prev)}
                className={`rounded-lg border border-[#2D3450] hover:border-[#7B6FD4] px-3 py-2 text-xs font-medium text-[#C7D2FE] hover:text-[#EDF0F7] transition-all ${btnFocus}`}
              >
                Export Governance Brief
              </button>
            </div>
            {showWorkflowPanel && (
              <div className="rounded-lg border border-[#4ADE9A]/30 bg-[#0F1A17] px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#86EFAC]">Workflow initiated</div>
                    <div className="text-xs text-[#A8B4C8] mt-0.5">Assigned to Legal, Finance, HR Ops.</div>
                  </div>
                  <button
                    onClick={() => setShowWorkflowPanel(false)}
                    className={`text-[11px] text-[#A8B4C8] hover:text-[#EDF0F7] transition-colors ${btnFocus}`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {showExportPanel && (
              <div className="rounded-lg border border-[#2D3450] bg-[#141829] px-3 py-2.5 space-y-2">
                <div>
                  <div className="text-xs font-semibold text-[#EDF0F7]">Export ready (mock)</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setExportActionState('downloading')}
                    className={`rounded-md border border-[#2D3450] hover:border-[#7B6FD4] px-2.5 py-1.5 text-[11px] text-[#A8B4C8] hover:text-[#EDF0F7] transition-all ${btnFocus}`}
                  >
                    {exportActionState === 'downloading' ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => setExportActionState('copied')}
                    className={`rounded-md border border-[#2D3450] hover:border-[#7B6FD4] px-2.5 py-1.5 text-[11px] text-[#A8B4C8] hover:text-[#EDF0F7] transition-all ${btnFocus}`}
                  >
                    {exportActionState === 'copied' ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Key signal cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <SignalCard
              label="Cost Impact"
              value={formatUSD(s.totalCostImpact)}
              sub="Modeled across all events"
              accent="purple"
              modeled
            />
            <SignalCard
              label="Tax Presence Exposure"
              value={`${Math.round(s.exposureScore)}`}
              sub="Exposure index /100"
              accent={s.exposureScore >= 70 ? 'red' : s.exposureScore >= 40 ? 'yellow' : 'green'}
              tooltip="Tax Presence Exposure (modeled): indicative risk of triggering permanent establishment based on event type and country."
            />
            <SignalCard
              label="Governance Load"
              value={`${Math.round(s.governanceLoad)}`}
              sub="Governance index /100"
              accent={s.governanceLoad >= 70 ? 'red' : s.governanceLoad >= 40 ? 'yellow' : 'green'}
              tooltip="Governance Load: volume × complexity of policies and approvals required across countries in scope."
            />
          </div>

          {/* Staging Optimization Scenario */}
          {isCompare && evalB && (
            <section className="mt-6 rounded-xl border border-[#7B6FD4]/35 bg-[#14122A] px-4 py-4 shadow-[0_0_0_1px_rgba(123,111,212,0.15),0_8px_24px_rgba(20,18,42,0.45)]">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-[#E9E7FF]">Staging Optimization Scenario</h3>
                <p className="text-[10px] text-[#A8B4C8] mt-0.5">Current vs Optimized staging</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <DeltaCard
                  label="WFS"
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
            </section>
          )}

          {evaluation.stagingSuggestion && (
            <div className="rounded-xl border border-[#C4B5FD]/25 bg-[#14122A] px-4 py-3">
              <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium mb-1.5">
                Staging Suggestion
              </div>
              <p className="text-[#A8B4C8] text-xs leading-relaxed">{evaluation.stagingSuggestion}</p>
            </div>
          )}

          <section className="rounded-xl border border-[#4ADE9A]/30 bg-[#0F1A17] px-4 py-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-[#D1FAE5]">Impact of sequencing</h3>
                <p className="text-[10px] text-[#7A8AA3] mt-0.5">Modeled scenario · Illustrative only</p>
              </div>
              <span className="text-[10px] rounded-full bg-[#4ADE9A]/15 border border-[#4ADE9A]/35 px-2 py-0.5 text-[#86EFAC]">
                −28% exposure · {reducedBreaches} fewer breaches
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#2D3450] bg-[#141829] px-3 py-2">
                <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider mb-1">Current trajectory</div>
                <div className="space-y-1 text-xs text-[#EDF0F7]">
                  <div className="flex justify-between"><span>Exposure:</span><span>{formatSignalNumber(currentExposure)}</span></div>
                  <div className="flex justify-between"><span>Threshold breaches:</span><span>{currentBreaches}</span></div>
                  <div className="flex justify-between"><span>WFS:</span><span>{currentWFS}</span></div>
                </div>
              </div>
              <div className="rounded-lg border border-[#2D3450] bg-[#141829] px-3 py-2">
                <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider mb-1">Recommended sequencing</div>
                <div className="space-y-1 text-xs text-[#EDF0F7]">
                  <div className="flex justify-between"><span>Exposure:</span><span>{formatSignalNumber(recommendedExposure)}</span></div>
                  <div className="flex justify-between"><span>Threshold breaches:</span><span>{recommendedBreaches}</span></div>
                  <div className="flex justify-between"><span>WFS:</span><span>{recommendedWFS}</span></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowSequencingConfirm(true)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all ${btnFocus}`}
                    style={{ background: 'linear-gradient(135deg, #7B6FD4 0%, #5F54B0 100%)' }}
                  >
                    Apply recommended sequencing →
                  </button>
                  <button
                    onClick={() => setShowSequencingWhy((prev) => !prev)}
                    className={`text-[11px] text-[#C4B5FD] hover:text-[#D4C5FD] border border-[#7B6FD4]/35 hover:border-[#7B6FD4] rounded-lg px-2.5 py-1.5 transition-all ${btnFocus}`}
                  >
                    {showSequencingWhy ? 'Hide why ▴' : 'Why this sequencing?'}
                  </button>
                </div>
              </div>
            </div>
            {showSequencingWhy && (
              <div className="mt-3 rounded-lg border border-[#2D3450] bg-[#141829] px-3 py-2.5">
                <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-1.5">
                  Why this sequencing
                </div>
                <ul className="space-y-1">
                  {sequencingReasons.map((reason) => (
                    <li key={reason} className="text-xs text-[#A8B4C8] leading-relaxed flex items-start gap-1.5">
                      <span className="text-[#4ADE9A] flex-shrink-0 mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {showSequencingConfirm && (
              <div className="mt-3 rounded-lg border border-[#7B6FD4]/35 bg-[#14122A] px-3 py-2.5">
                <div className="text-xs text-[#EDF0F7] font-medium">Confirm sequencing action</div>
                <div className="text-[11px] text-[#A8B4C8] mt-1">
                  Choose whether to apply this recommendation now or log the decision only.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSequencingDecision('ACCEPT_APPLY')}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all ${btnFocus}`}
                    style={{ background: '#7B6FD4' }}
                  >
                    Accept and apply
                  </button>
                  <button
                    onClick={() => handleSequencingDecision('ACCEPT_LOG_ONLY')}
                    className={`rounded-md border border-[#2D3450] hover:border-[#7B6FD4] px-2.5 py-1.5 text-[11px] text-[#A8B4C8] hover:text-[#EDF0F7] transition-all ${btnFocus}`}
                  >
                    Accept (log only)
                  </button>
                  <button
                    onClick={() => handleSequencingDecision('DECLINE')}
                    className={`rounded-md border border-[#2D3450] hover:border-[#FC8181]/50 px-2.5 py-1.5 text-[11px] text-[#A8B4C8] hover:text-[#FCA5A5] transition-all ${btnFocus}`}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
            {(sequencingToast || canRevertSequencing) && (
              <div className="mt-2 flex items-center gap-3">
                {sequencingToast && (
                  <div className="rounded-md border border-[#4ADE9A]/30 bg-[#0F1A17] px-2.5 py-1 text-[11px] text-[#86EFAC]">
                    Sequencing applied (mock)
                  </div>
                )}
                {canRevertSequencing && onRevertSequencing && (
                  <button
                    onClick={onRevertSequencing}
                    className={`text-[11px] text-[#C4B5FD] hover:text-[#D4C5FD] border border-[#7B6FD4]/35 hover:border-[#7B6FD4] rounded-md px-2 py-1 transition-all ${btnFocus}`}
                  >
                    Revert
                  </button>
                )}
              </div>
            )}
            <p className="text-[10px] text-[#8899B2] italic mt-2">Sequencing model · Modeled delta · Not a guarantee</p>
          </section>

          <section className="rounded-xl border border-[#2D3450] bg-[#141829] px-4 py-3 text-[12px]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-[#A8B4C8] uppercase tracking-wider text-[10px] font-medium">Decision Log (session)</h3>
              <button
                onClick={() => setIsNoteComposerOpen((prev) => !prev)}
                className={`text-[11px] text-[#C4B5FD] hover:text-[#D4C5FD] transition-colors ${btnFocus}`}
              >
                + Add note
              </button>
            </div>
            <div className="space-y-1.5 text-[#A8B4C8]">
              <div>LOG-082 · Scenario staged by You · WFS {displayWFS} · Deterministic Rule Set v2.1 · {decisionLogTimestamp}</div>
              {actionEntries.map((entry, idx) => (
                <div key={`action-${idx}-${entry}`}>{entry}</div>
              ))}
              {noteEntries.map((entry, idx) => (
                <div key={`note-${idx}-${entry}`}>{entry}</div>
              ))}
            </div>
            {isNoteComposerOpen && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-[#1A1F35] border border-[#2D3450] px-2.5 py-2 text-xs text-[#EDF0F7] focus:outline-none focus:border-[#7B6FD4] focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
                  placeholder="Add a decision note"
                />
                <button
                  onClick={handleSaveNote}
                  className={`rounded-md border border-[#2D3450] hover:border-[#7B6FD4] px-2.5 py-1.5 text-[11px] text-[#A8B4C8] hover:text-[#EDF0F7] transition-all ${btnFocus}`}
                >
                  Save
                </button>
              </div>
            )}
          </section>
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
        <div className="min-w-0">
          <h2 className="text-[#F1F5F9] text-sm font-semibold">Impact Analysis</h2>
          <p className="text-[#8899B2] text-xs mt-0.5">Operator view · Raw signals &amp; policy detail</p>
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
              sub="Modeled across all events"
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
              label="Payroll Clustering"
              value={s.pcr}
              sub="Payroll cycle clustering"
              accent={pcrColor(s.pcr)}
              labelClassName="flex-1 text-[11px] leading-tight whitespace-normal"
            />
            <SignalCard
              label="Liability Tail"
              value={formatUSD(s.liabilityTail)}
              sub="Benefits continuation"
              accent="orange"
              modeled
              labelClassName="flex-1 text-[11px] leading-tight whitespace-normal"
            />
            <SignalCard
              label="Threshold Breaches"
              value={`${breachedCount} / ${evaluation.thresholdBreaches.length}`}
              sub="Breached thresholds"
              accent={breachedCount > 2 ? 'red' : breachedCount > 0 ? 'yellow' : 'green'}
              labelClassName="flex-1 text-[11px] leading-tight whitespace-normal"
            />
          </div>
        </div>

        {/* Decision priorities */}
        <DecisionPrioritiesPanel weights={weights} onWeightChange={onWeightChange} />

        {/* WFS Formula Breakdown */}
        <OFSFormulaTable evaluation={evaluation} liveOFS={liveOFS} />

        <button
          onClick={() => setShowTechnicalDetail((prev) => !prev)}
          className={`w-full rounded-xl border border-[#2D3450] bg-[#1A1F35] px-3 py-2 text-left text-xs text-[#A8B4C8] hover:text-[#EDF0F7] hover:border-[#7B6FD4]/50 transition-all ${btnFocus}`}
          aria-expanded={showTechnicalDetail}
          aria-controls={technicalDetailPanelId}
        >
          {showTechnicalDetail ? 'Hide technical detail ▴' : 'Show technical detail ▾'}
        </button>

        <div
          id={technicalDetailPanelId}
          className={`overflow-hidden transition-[max-height,opacity] duration-200 ${showTechnicalDetail ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pt-4 space-y-5">
            <InputConfidenceMeter score={evaluation.componentScores.inputCompletenessScore} />

            <div>
              <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
                Risk Heatmap · Score 0–100
              </div>
              <RiskHeatmap cells={evaluation.heatmap} />
            </div>

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

            <div>
              <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
                Required Workflow
              </div>
              <WorkflowTimeline steps={evaluation.workflow} />
              <div className="mt-2">
                <WorkflowSteps steps={evaluation.workflow} />
              </div>
            </div>

            {evaluation.stagingSuggestion && (
              <div className="rounded-xl border border-[#C4B5FD]/25 bg-[#14122A] px-4 py-3">
                <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium mb-1.5">
                  Staging Suggestion
                </div>
                <p className="text-[#A8B4C8] text-xs leading-relaxed">{evaluation.stagingSuggestion}</p>
              </div>
            )}

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
          </div>
        </div>

        <div className="text-center text-[#8899B2] text-[10px] pb-2">
          Preview build. Modeled scenario.
        </div>
      </div>
    </div>
  );
}
