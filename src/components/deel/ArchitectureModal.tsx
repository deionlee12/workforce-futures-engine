'use client';

import React from 'react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const engineNodes = [
  { label: 'riskEngine()', sub: 'PolicyTrigger[]', color: '#FC8181' },
  { label: 'thresholdEngine()', sub: 'ThresholdBreach[]', color: '#FB923C' },
  { label: 'workflowOrchestrator()', sub: 'WorkflowStep[]', color: '#FCD34D' },
  { label: 'computeOFS / GLI / PCR', sub: 'Signal metrics', color: '#4ADE9A' },
  { label: 'computeLiabilityTail()', sub: 'Modeled USD', color: '#C4B5FD' },
];

const outputNodes = [
  { label: 'Impact Analysis', sub: 'OFS · Cards · Heatmap · Workflow', color: '#7DD3FC' },
  { label: 'Explainability Drawer', sub: 'PolicyTriggers · Evidence', color: '#C4B5FD' },
  { label: '/api/copilot (POST)', sub: 'Decision Assistant · Executive brief', color: '#4ADE9A' },
];

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

export default function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[#2D3450] bg-[#0F1117] p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[#F1F5F9] text-lg font-semibold">System Architecture</h2>
            <p className="text-[#A8B4C8] text-xs mt-0.5">Workforce Decision Layer · Data flow diagram</p>
          </div>
          <button
            onClick={onClose}
            className={`text-[#8899B2] hover:text-[#EDF0F7] transition-colors text-xl leading-none rounded-lg p-1 ${btnFocus}`}
            aria-label="Close architecture diagram"
          >
            ×
          </button>
        </div>

        {/* Flow */}
        <div className="space-y-3">
          {/* Step 1: Input */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'rgba(124,111,212,0.08)', borderColor: 'rgba(124,111,212,0.25)' }}
          >
            <div className="text-[#C4B5FD] text-xs font-semibold uppercase tracking-wider mb-1">① Input</div>
            <div className="text-[#EDF0F7] font-medium">Scenario Builder</div>
            <div className="text-[#A8B4C8] text-xs mt-0.5">
              Country · Worker Type · Event Type · Job Function · Quantity · Quarter · Avg Salary
            </div>
          </div>

          <div className="flex justify-center text-[#2D3450] text-lg">↓</div>

          {/* Step 2: Engine */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'rgba(125,211,252,0.05)', borderColor: 'rgba(125,211,252,0.2)' }}
          >
            <div className="text-[#7DD3FC] text-xs font-semibold uppercase tracking-wider mb-2">
              ② Engine — evaluateScenario(events, weights?)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {engineNodes.map((n) => (
                <div
                  key={n.label}
                  className="rounded-lg px-3 py-2 border"
                  style={{
                    background: `${n.color}10`,
                    borderColor: `${n.color}25`,
                  }}
                >
                  <div className="text-xs font-mono font-medium" style={{ color: n.color }}>
                    {n.label}
                  </div>
                  <div className="text-[#A8B4C8] text-[10px] mt-0.5">{n.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[#8899B2] text-[10px] font-mono">
              → ScenarioEvaluation &#123; signals · heatmap · triggers · workflow · evidence · componentScores &#125;
            </div>
          </div>

          <div className="flex justify-center text-[#2D3450] text-lg">↓</div>

          {/* Step 3: Output */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'rgba(74,222,154,0.04)', borderColor: 'rgba(74,222,154,0.15)' }}
          >
            <div className="text-[#4ADE9A] text-xs font-semibold uppercase tracking-wider mb-2">③ Output</div>
            <div className="grid grid-cols-3 gap-2">
              {outputNodes.map((n) => (
                <div
                  key={n.label}
                  className="rounded-lg px-3 py-2 border"
                  style={{ background: `${n.color}10`, borderColor: `${n.color}25` }}
                >
                  <div className="text-xs font-medium" style={{ color: n.color }}>
                    {n.label}
                  </div>
                  <div className="text-[#A8B4C8] text-[10px] mt-0.5">{n.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg bg-[#1A1F35] border border-[#2D3450] px-4 py-3 text-[#A8B4C8] text-xs space-y-1.5">
            <div>
              <span className="text-[#EDF0F7] font-medium">Data:</span>{' '}
              /src/data/ &#40;countries.json · policyRules.json · workflowTemplates.json · thresholdDefinitions.json&#41;
            </div>
            <div>
              <span className="text-[#EDF0F7] font-medium">Decision Assistant:</span>{' '}
              POST /api/copilot · Receives full ScenarioEvaluation · Generates executive brief + Q&amp;A · Never invents external facts
            </div>
            <div>
              <span className="text-[#EDF0F7] font-medium">Client-side OFS:</span>{' '}
              computeOFSFromComponents(scores, weights) — weight sliders recompute OFS without re-running the engine
            </div>
            <div>
              <span className="text-[#EDF0F7] font-medium">Note:</span>{' '}
              All signals are deterministic. No randomness. Same inputs → same outputs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
