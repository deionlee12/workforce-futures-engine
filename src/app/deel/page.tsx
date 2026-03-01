'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ScenarioEvent, ScenarioEvaluation, OFSWeights, ExecBrief } from '@/engine/types';
import { evaluateScenario, applyRecommendedSequencing, DEFAULT_OFS_WEIGHTS } from '@/engine/evaluateScenario';
import ScenarioBuilder from '@/components/deel/ScenarioBuilder';
import ImpactAnalysis from '@/components/deel/ImpactAnalysis';
import DecisionAssistant from '@/components/deel/DecisionAssistant';
import ArchitectureModal from '@/components/deel/ArchitectureModal';
import ExplainabilityDrawer from '@/components/deel/ExplainabilityDrawer';
import MobileGate from '@/components/deel/MobileGate';
import { applySequencingToEvaluation, computeWFS } from '@/lib/wfs';

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

const AI_NARRATION_PREF_KEY = 'wfs_ai_narration_enabled';

// ── Page component ────────────────────────────────────────────────────────────

export default function DeelPage() {
  const [events, setEvents] = useState<ScenarioEvent[]>([]);
  const [evaluation, setEvaluation] = useState<ScenarioEvaluation | null>(null);
  const [lastOFSChange, setLastOFSChange] = useState<{ before: number; after: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [weights, setWeights] = useState<OFSWeights>(DEFAULT_OFS_WEIGHTS);
  const [activeView, setActiveView] = useState<'executive' | 'operator'>('executive');
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);
  const [explainabilityFilter, setExplainabilityFilter] = useState<string[] | undefined>(undefined);
  const [execBrief, setExecBrief] = useState<ExecBrief | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [aiNarrationEnabled, setAiNarrationEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AI_NARRATION_PREF_KEY) === '1';
  });
  const aiNarrationEnabledRef = useRef(aiNarrationEnabled);
  const [lastSequencingSnapshot, setLastSequencingSnapshot] = useState<ScenarioEvent[] | null>(null);

  // Live OFS recomputed from weights without re-running engine
  const liveOFS = evaluation
    ? computeWFS(evaluation.componentScores, weights)
    : null;

  const requestExecBrief = useCallback(async (
    nextEval: ScenarioEvaluation | null,
    options?: { force?: boolean },
  ) => {
    const shouldRun = !!options?.force || aiNarrationEnabledRef.current;
    if (!nextEval || !shouldRun) {
      setExecBrief(null);
      setIsBriefLoading(false);
      return;
    }
    setIsBriefLoading(true);
    setExecBrief(null);
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Generate executive brief for this scenario',
          evaluation: nextEval,
          mode: 'brief',
        }),
      });
      const data: ExecBrief = await response.json();
      if (!aiNarrationEnabledRef.current && !options?.force) return;
      setExecBrief(data);
    } catch {
      // ignore brief generation failures in demo mode
    } finally {
      setIsBriefLoading(false);
    }
  }, []);

  useEffect(() => {
    aiNarrationEnabledRef.current = aiNarrationEnabled;
    window.localStorage.setItem(AI_NARRATION_PREF_KEY, aiNarrationEnabled ? '1' : '0');
  }, [aiNarrationEnabled]);

  useEffect(() => {
    if (!lastOFSChange) return;
    const timer = window.setTimeout(() => setLastOFSChange(null), 5000);
    return () => window.clearTimeout(timer);
  }, [lastOFSChange]);

  const handleAddEvent = useCallback((event: ScenarioEvent) => {
    setLastSequencingSnapshot(null);
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleRemoveEvent = useCallback((id: string) => {
    setLastSequencingSnapshot(null);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handlePreviewImpact = useCallback(() => {
    if (events.length === 0) return;
    setLastSequencingSnapshot(null);
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(events, weights);
      setEvaluation(result);
      void requestExecBrief(result);
      setIsRunning(false);
    }, 600);
  }, [events, weights, requestExecBrief]);

  const handleWowButton = useCallback((preset: 1 | 2 | 3) => {
    const presetEvents = getWowPreset(preset);
    setLastSequencingSnapshot(null);
    setEvents(presetEvents);
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(presetEvents, weights);
      setEvaluation(result);
      void requestExecBrief(result);
      setIsRunning(false);
    }, 800);
  }, [weights, requestExecBrief]);

  const handleWeightChange = useCallback((key: keyof OFSWeights, value: number) => {
    setWeights((prev) => normalizeWeights(prev, key, value));
  }, []);

  const handleOpenExplainability = useCallback((policyIds?: string[]) => {
    setExplainabilityFilter(policyIds);
    setShowExplainability(true);
  }, []);

  const handleApplySequencing = useCallback(() => {
    if (!evaluation) return;
    const beforeOFS = computeWFS(evaluation.componentScores, weights);
    setLastSequencingSnapshot(events.map((evt) => ({ ...evt })));
    setLastOFSChange(null);
    const optimized = applyRecommendedSequencing(events);
    setEvents(optimized);
    setIsRunning(true);
    setTimeout(() => {
      const result = applySequencingToEvaluation(evaluation, weights);
      setEvaluation(result);
      void requestExecBrief(result);
      const afterOFS = computeWFS(result.componentScores, weights);
      if (Math.abs(beforeOFS - afterOFS) > 0.001) {
        setLastOFSChange({ before: beforeOFS, after: afterOFS });
      }
      setIsRunning(false);
    }, 600);
  }, [events, evaluation, weights, requestExecBrief]);

  const handleRevertSequencing = useCallback(() => {
    if (!lastSequencingSnapshot || lastSequencingSnapshot.length === 0) return;
    const restored = lastSequencingSnapshot.map((evt) => ({ ...evt }));
    setEvents(restored);
    setIsRunning(true);
    setTimeout(() => {
      const result = evaluateScenario(restored, weights);
      setEvaluation(result);
      void requestExecBrief(result);
      setLastSequencingSnapshot(null);
      setIsRunning(false);
    }, 600);
  }, [lastSequencingSnapshot, weights, requestExecBrief]);

  const handleSetAiNarrationEnabled = useCallback((enabled: boolean) => {
    setAiNarrationEnabled(enabled);
    if (!enabled) {
      setExecBrief(null);
      setIsBriefLoading(false);
      return;
    }
    if (evaluation) {
      void requestExecBrief(evaluation, { force: true });
    }
  }, [evaluation, requestExecBrief]);

  return (
    <MobileGate>
      <div className="h-screen flex flex-col bg-[#0A0C14] overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 border-b border-[#1E2235] flex items-center justify-between px-4 gap-4 bg-[#0F1117]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B6FD4] to-[#4F46A3] flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">W</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[#F1F5F9] text-sm font-semibold leading-tight truncate">
                Workforce Decision Layer
              </h1>
              <span className="flex-shrink-0 rounded-full border border-[#7B6FD4]/40 bg-[#7B6FD4]/10 px-2 py-0.5 text-[10px] font-medium text-[#C4B5FD]">
                Demo Preview
              </span>
            </div>
            <p className="text-[#8899B2] text-[10px] leading-tight hidden lg:block">
              Simulate workforce decisions before committing capital, contracts, or compliance exposure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Executive / Operator toggle */}
          <div className="flex items-center gap-px rounded-lg border border-[#2D3450] overflow-hidden">
            {(['executive', 'operator'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-3 py-1 text-[11px] font-medium transition-colors capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7B6FD4] ${
                  activeView === v
                    ? 'bg-[#7B6FD4] text-white'
                    : 'text-[#C7D2FE] hover:text-white bg-transparent'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSetAiNarrationEnabled(!aiNarrationEnabled)}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7B6FD4] ${
              aiNarrationEnabled
                ? 'border-[#4ADE9A]/50 bg-[#0F1A17] text-[#86EFAC]'
                : 'border-[#2D3450] text-[#A8B4C8] hover:text-[#EDF0F7]'
            }`}
            aria-pressed={aiNarrationEnabled}
          >
            AI Narration {aiNarrationEnabled ? 'On' : 'Off'}
          </button>

          <div
            className={`hidden md:flex items-center gap-1.5 text-[10px] border rounded-lg px-2.5 py-1 ${
              evaluation
                ? 'text-[#A8B4C8] border-[#2D3450]'
                : 'text-[#7A8AA3] border-[#2D3450]/70'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                evaluation ? 'bg-[#4ADE9A]' : 'bg-[#5A6A85]'
              }`}
            />
            {evaluation ? 'Impact active' : 'Impact idle'}
          </div>

          {activeView === 'operator' && evaluation && (
            <button
              onClick={() => handleOpenExplainability()}
              className="text-xs text-[#C4B5FD] hover:text-[#D4C5FD] border border-[#7B6FD4]/40 hover:border-[#7B6FD4] rounded-lg px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
            >
              Explain Why →
            </button>
          )}

          <button
            onClick={() => setShowArchitecture(true)}
            className="text-xs text-[#A8B4C8] hover:text-[#C4B5FD] border border-[#2D3450] hover:border-[#7B6FD4] rounded-lg px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
          >
            How this works
          </button>
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
            activeView={activeView}
            weights={weights}
            onWeightChange={handleWeightChange}
            liveOFS={liveOFS}
            onOpenExplainability={handleOpenExplainability}
            onApplySequencing={handleApplySequencing}
            execBrief={execBrief}
            isBriefLoading={isBriefLoading}
            lastOFSChange={lastOFSChange}
            canRevertSequencing={!!lastSequencingSnapshot}
            onRevertSequencing={handleRevertSequencing}
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
            aiEnabled={aiNarrationEnabled}
            onEnableAiNarration={() => handleSetAiNarrationEnabled(true)}
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
    </MobileGate>
  );
}
