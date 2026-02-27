'use client';

import React from 'react';
import type { WorkflowStep, EventType } from '@/engine/types';

interface WorkflowStepsProps {
  steps: WorkflowStep[];
}

const EVENT_COLORS: Record<EventType, string> = {
  contractor_conversion: '#C4B5FD',
  termination: '#FC8181',
  relocation: '#7DD3FC',
  eor_onboarding: '#4ADE9A',
};

const EVENT_LABELS: Record<EventType, string> = {
  contractor_conversion: 'Conversion',
  termination: 'Termination',
  relocation: 'Relocation',
  eor_onboarding: 'EOR',
};

export default function WorkflowSteps({ steps }: WorkflowStepsProps) {
  if (steps.length === 0) {
    return (
      <div className="text-[#8899B2] text-sm text-center py-4">
        Preview Impact to see required workflow steps
      </div>
    );
  }

  const totalDays = steps.reduce((max, s) => Math.max(max, s.daysRequired), 0);
  const totalSequentialDays = steps.reduce((sum, s) => sum + s.daysRequired, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#A8B4C8] uppercase tracking-wider">
          {steps.length} steps · ~{totalSequentialDays} days sequential
        </span>
        <span className="text-[10px] text-[#8899B2]">
          max single path: {totalDays}d
        </span>
      </div>
      {steps.map((step) => {
        const color = EVENT_COLORS[step.eventType] ?? '#A8B4C8';
        return (
          <div
            key={step.stepId}
            className="rounded-lg border border-[#2D3450] bg-[#1A1F35] px-3 py-2.5 flex items-start gap-3"
          >
            <div className="flex-shrink-0 mt-0.5">
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: `${color}18`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {step.stepId}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#EDF0F7] text-xs font-medium leading-tight">{step.title}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[#A8B4C8] text-[10px]">{step.owner}</span>
                <span className="text-[#2D3450]">·</span>
                <span className="text-[#A8B4C8] text-[10px]">{step.daysRequired}d</span>
                {step.systemsTouched.length > 0 && (
                  <>
                    <span className="text-[#2D3450]">·</span>
                    <span className="text-[#8899B2] text-[10px]">
                      {step.systemsTouched.slice(0, 2).join(', ')}
                      {step.systemsTouched.length > 2 && ` +${step.systemsTouched.length - 2}`}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${color}15`, color }}
              >
                {EVENT_LABELS[step.eventType] ?? step.eventType}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
