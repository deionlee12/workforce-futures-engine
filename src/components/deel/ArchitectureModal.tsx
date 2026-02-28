'use client';

import React from 'react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pipelineSteps = [
  {
    id: 'Step 1',
    title: 'Scenario Ingestion',
    detail: 'Country, worker type, event, quantity, timing, function, compensation',
    color: '#C4B5FD',
  },
  {
    id: 'Step 2',
    title: 'Deterministic Evaluation',
    detail: 'Policy library matching · Threshold engine · Weighted scoring matrix',
    color: '#7DD3FC',
  },
  {
    id: 'Step 3',
    title: 'Intelligence Synthesis',
    detail: 'AI narration constrained to evaluation output only',
    color: '#4ADE9A',
  },
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
            <h2 className="text-[#F1F5F9] text-lg font-semibold">Evaluation Pipeline</h2>
            <p className="text-[#A8B4C8] text-xs mt-0.5">Workforce Decision Layer · Decision pipeline</p>
            <p className="text-[#A8B4C8] text-xs mt-1.5">
              Workforce Friction Score (WFS) is a 0–100 composite of exposure, governance load, execution clustering, and input confidence.
            </p>
            <p className="text-[#D1FAE5] text-xs mt-2">AI narrates deterministic signals. It does not invent facts.</p>
          </div>
          <button
            onClick={onClose}
            className={`text-[#8899B2] hover:text-[#EDF0F7] transition-colors text-xl leading-none rounded-lg p-1 ${btnFocus}`}
            aria-label="Close architecture diagram"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            {pipelineSteps.map((step) => (
              <div
                key={step.id}
                className="rounded-xl p-4 border"
                style={{ background: `${step.color}10`, borderColor: `${step.color}30` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: step.color }}>
                  {step.id}
                </div>
                <div className="text-[#EDF0F7] font-medium">{step.title}</div>
                <div className="text-[#A8B4C8] text-xs mt-0.5">{step.detail}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[#1A1F35] border border-[#2D3450] px-4 py-3 space-y-2">
            <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium">
              System Integrity
            </div>
            <div className="text-xs text-[#A8B4C8]">
              <span className="text-[#EDF0F7] font-medium">Rule Engine:</span> Deterministic (Edge Function)
            </div>
            <div className="text-xs text-[#A8B4C8]">
              <span className="text-[#EDF0F7] font-medium">Narration:</span> AI-constrained to simulation output
            </div>
            <div className="text-xs text-[#A8B4C8]">
              <span className="text-[#EDF0F7] font-medium">Evaluation Layer:</span> Edge evaluated. No LLM in risk calculation layer.
            </div>
            <div className="text-xs text-[#A8B4C8]">
              <span className="text-[#EDF0F7] font-medium">Policy IDs:</span> Illustrative only
            </div>
          </div>

          <div className="text-[#8899B2] text-xs italic">
            Designed for People Ops, Legal, Finance, and Product to align on workforce moves before execution.
          </div>
        </div>
      </div>
    </div>
  );
}
