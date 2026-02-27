'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { ScenarioEvent, ScenarioEvaluation, OFSWeights, ExecBrief } from '@/engine/types';
import { evaluateScenario, applyRecommendedSequencing, computeOFSFromComponents, DEFAULT_OFS_WEIGHTS } from '@/engine/evaluateScenario';
import ScenarioBuilder from '@/components/deel/ScenarioBuilder';
import ImpactAnalysis from '@/components/deel/ImpactAnalysis';
import DecisionAssistant from '@/components/deel/DecisionAssistant';
import ArchitectureModal from '@/components/deel/ArchitectureModal';
import ExplainabilityDrawer from '@/components/deel/ExplainabilityDrawer';

// ── Scenario presets ──────────────────────────────────────────────────────────

function getWowPreset(n: 1 | 2 | 3): ScenarioEvent[] {
  if (n === 1) {
    return [
      { id: 'wow1-es', country: 'ES', workerType: 'contractor', eventType: 'contractor_conversion', jobFunction: 'Engineering', quantity: 6, timingQuarter: 'Q3', avgAnnualSalaryUsd: 75000 },
      { id: 'wow1-de', country: 'DE', workerType: 'contractor', eventType: 'contractor_conversion', jobFunction: 'Engineering', quantity: 6, timingQuarter: 'Q3', avgAnnualSalaryUsd: 85000 },
    ];
  }
  if (n === 2) {
    return [
      { id: 'wow2-rel', country: 'US', workerType: 'direct_employee', eventType: 'relocation', jobFunction: 'Engineering', quantity: 5, timingQuarter: 'Q2', avgAnnualSalaryUsd: 140000, destinationCountry: 'GB' },
    ];
  }
  return [
    { id: 'wow3-de', country: 'DE', workerType: 'eor_employee', eventType: 'termination', jobFunction: 'Operations', quantity: 5, timingQuarter: 'Q2', avgAnnualSalaryUsd: 90000 },
  ];
}

// ── Weight normalization ──────────────────────────────────────────────────────

function normalizeWeights(prev: OFSWeights, changedKey: keyof OFSWeights, rawValue: number): OFSWeights {
  const clamped = Math.max(0.05, Math.min(0.85, rawValue));
  const others = (Object.keys(prev) as (keyof OFSWeights)[]).filter((k) => k !== changedKey);
  const currentOtherSum = others.reduce((sum, k) => sum + prev[k], 0);
  const targetOtherSum = 1 - clamped;

  const result: OFSWeights = { ...prev, [changedKey]: clamped };

  if (currentOtherSum > 0) {
    const scale = targetOtherSum / currentOtherSum;
    others.forEach((k) => {
      result[k] = Math.round(prev[k] * scale * 100) / 100;
    });
    // Fix floating point drift
    const total = (Object.values(result) as number[]).reduce((s, v) => s + v, 0);
    const diff = Math.round((1 - total) * 100) / 100;
    if (Math.abs(diff) > 0.001) {
      result[others[others.length - 1]] = Math.round((result[others[others.length - 1]] + diff) * 100) / 100;
    }
  } else {
    const equal = Math.round((targetOtherSum / others.length) * 100) / 100;
    others.forEach((k) => { result[k] = equal; });
  }

  return result;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function DeelPage() {
  const [events, setEvents] = useState<ScenarioEvent[]>([]);
  const [evaluation, setEvaluation] = useState<ScenarioEvaluation | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [weights, setWeights] = useState<OFSWeights>(DEFAULT_OFS_WEIGHTS);
  const [activeView, setActiveView] = useState<'executive' | 'operator'>('executive');
  const [isCompare, setIsCompare] = useState(false);
  const [evalB, setEvalB] = useState<ScenarioEvaluation | null>(null);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);
  const [explainabilityFilter, setExplainabilityFilter] = useState<string[] | undefined>(undefined);
  const [execBrief, setExecBrief] = useState<ExecBrief | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);

  // Live OFS recomputed from weights without re-running engine
  const liveOFS = evaluation
    ? computeOFSFromComponents(evaluation.componentScores, weights)
    : null;

  // Auto-generate executive brief when evaluation changes
  useEffect(() => {
    if (!evaluation) { setExecBrief(null); return; }
    setIsBriefLoading(true);
    setExecBrief(null);
    fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Generate executive brief for this scenario', evaluation, mode: 'brief' }),
    })
      .then((r) => r.json())
      .then((data: ExecBrief) => setExecBrief(data))
      .catch(() => {})
      .finally(() => setIsBriefLoading(false));
  }, [evaluation]);

  // Compare mode: auto-compute evalB = optimized version of current events
  useEffect(() => {
    if (!evaluation || !isCompare) { setEvalB(null); return; }
    const optimizedEvents = applyRecommendedSequencing(events);
    setEvalB(evaluateScenario(optimizedEvents, weights));
  }, [evaluation, isCompare, events, weights]);

  const handleAddEvent = useCallback((event: ScenarioEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleRemoveEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handlePreviewImpact = useCallback(() => {
    if (events.length === 0) return;
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(events, weights);
      setEvaluation(result);
      setIsRunning(false);
    }, 600);
  }, [events, weights]);

  const handleWowButton = useCallback((preset: 1 | 2 | 3) => {
    const presetEvents = getWowPreset(preset);
    setEvents(presetEvents);
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(presetEvents, weights);
      setEvaluation(result);
      setIsRunning(false);
    }, 800);
  }, [weights]);

  const handleWeightChange = useCallback((key: keyof OFSWeights, value: number) => {
    setWeights((prev) => normalizeWeights(prev, key, value));
  }, []);

  const handleOpenExplainability = useCallback((policyIds?: string[]) => {
    setExplainabilityFilter(policyIds);
    setShowExplainability(true);
  }, []);

  const handleApplySequencing = useCallback(() => {
    if (!evaluation) return;
    const optimized = applyRecommendedSequencing(events);
    setEvents(optimized);
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(optimized, weights);
      setEvaluation(result);
      setIsRunning(false);
    }, 600);
  }, [events, evaluation, weights]);

  return (
    <div className="h-screen flex flex-col bg-[#0A0C14] overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 border-b border-[#1E2235] flex items-center justify-between px-4 gap-4 bg-[#0F1117]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B6FD4] to-[#4F46A3] flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">W</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-[#F1F5F9] text-sm font-semibold leading-tight truncate">
              Workforce Decision Layer
            </h1>
            <p className="text-[#8899B2] text-[10px] leading-tight hidden sm:block">
              Preview · Deterministic evaluation · Illustrative model
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Executive / Operator toggle */}
          <div className="hidden sm:flex items-center gap-px rounded-lg border border-[#2D3450] overflow-hidden">
            {(['executive', 'operator'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-3 py-1 text-[11px] font-medium transition-colors capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7B6FD4] ${
                  activeView === v
                    ? 'bg-[#7B6FD4] text-white'
                    : 'text-[#A8B4C8] hover:text-[#EDF0F7] bg-transparent'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Compare toggle */}
          {evaluation && (
            <button
              onClick={() => setIsCompare((p) => !p)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7B6FD4] ${
                isCompare
                  ? 'border-[#7B6FD4] bg-[#14122A] text-[#C4B5FD]'
                  : 'border-[#2D3450] text-[#A8B4C8] hover:text-[#EDF0F7]'
              }`}
            >
              A/B
            </button>
          )}

          {evaluation && (
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#A8B4C8] border border-[#2D3450] rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE9A] inline-block" />
              Impact active
            </div>
          )}

          <button
            onClick={() => setShowArchitecture(true)}
            className="text-xs text-[#A8B4C8] hover:text-[#C4B5FD] border border-[#2D3450] hover:border-[#7B6FD4] rounded-lg px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
          >
            Architecture
          </button>

          <div className="text-[10px] text-[#8899B2] hidden lg:block">
            Demo · Not legal advice
          </div>
        </div>
      </header>

      {/* ── 3-column layout ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden gap-px bg-[#2D3450]">
        {/* Left: Scenario Builder */}
        <div className="w-72 xl:w-80 flex-shrink-0 bg-[#0F1117] flex flex-col overflow-hidden">
          <ScenarioBuilder
            events={events}
            onAddEvent={handleAddEvent}
            onRemoveEvent={handleRemoveEvent}
            onRunSimulation={handlePreviewImpact}
            onWowButton={handleWowButton}
            isRunning={isRunning}
          />
        </div>

        {/* Center: Impact Analysis */}
        <div className="flex-1 bg-[#0F1117] flex flex-col overflow-hidden min-w-0">
          <ImpactAnalysis
            evaluation={evaluation}
            evalB={evalB}
            isCompare={isCompare}
            activeView={activeView}
            onViewChange={setActiveView}
            weights={weights}
            onWeightChange={handleWeightChange}
            liveOFS={liveOFS}
            onOpenExplainability={handleOpenExplainability}
            onApplySequencing={handleApplySequencing}
            execBrief={execBrief}
            isBriefLoading={isBriefLoading}
          />
        </div>

        {/* Right: Decision Assistant */}
        <div className="w-80 xl:w-96 flex-shrink-0 bg-[#0F1117] flex flex-col overflow-hidden">
          <DecisionAssistant
            evaluation={evaluation}
            initialBrief={execBrief}
            isBriefLoading={isBriefLoading}
            activeView={activeView}
            liveOFS={liveOFS}
          />
        </div>
      </div>

      {/* ── Modals / Drawers ─────────────────────────────────────────────────── */}
      <ArchitectureModal
        isOpen={showArchitecture}
        onClose={() => setShowArchitecture(false)}
      />
      <ExplainabilityDrawer
        isOpen={showExplainability}
        onClose={() => { setShowExplainability(false); setExplainabilityFilter(undefined); }}
        triggers={evaluation?.triggers ?? []}
        evidence={evaluation?.evidence ?? []}
        filterPolicyIds={explainabilityFilter}
      />
    </div>
  );
}
