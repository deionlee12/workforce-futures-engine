'use client';

import React from 'react';
import type { PolicyTrigger, Evidence, RiskSeverity } from '@/engine/types';

interface ExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggers: PolicyTrigger[];
  evidence: Evidence[];
  /** When provided, only show triggers whose policyId is in this list */
  filterPolicyIds?: string[];
}

const severityConfig: Record<
  RiskSeverity,
  { label: string; color: string; bg: string; border: string }
> = {
  CRITICAL: {
    label: 'Critical',
    color: '#FC8181',
    bg: '#1F1214',
    border: 'rgba(239,68,68,0.35)',
  },
  HIGH: {
    label: 'High',
    color: '#FB923C',
    bg: '#1E160F',
    border: 'rgba(249,115,22,0.35)',
  },
  MEDIUM: {
    label: 'Medium',
    color: '#FCD34D',
    bg: '#1D1A0F',
    border: 'rgba(245,158,11,0.3)',
  },
  LOW: {
    label: 'Low',
    color: '#4ADE9A',
    bg: '#0F1A17',
    border: 'rgba(74,222,154,0.25)',
  },
};

export default function ExplainabilityDrawer({
  isOpen,
  onClose,
  triggers,
  evidence,
  filterPolicyIds,
}: ExplainabilityDrawerProps) {
  if (!isOpen) return null;

  const evidenceMap = new Map<string, Evidence>();
  evidence.forEach((e) => evidenceMap.set(e.id, e));

  // Filter triggers when filterPolicyIds is provided
  const visibleTriggers = filterPolicyIds?.length
    ? triggers.filter((t) => filterPolicyIds.includes(t.policyId))
    : triggers;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="flex-1" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div
        className="relative w-full max-w-lg bg-[#0F1117] border-l border-[#2D3450] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1117] border-b border-[#2D3450] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[#F1F5F9] font-semibold">
              {filterPolicyIds?.length ? 'Related Policies' : 'Explain Why'}
            </h2>
            <p className="text-[#A8B4C8] text-xs mt-0.5">
              {visibleTriggers.length} triggered {visibleTriggers.length === 1 ? 'policy' : 'policies'} · {evidence.length} evidence items
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8899B2] hover:text-[#EDF0F7] transition-colors text-xl leading-none rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mx-6 mt-4 rounded-lg bg-[#1A1F35] border border-[#2D3450] px-4 py-2.5 text-[#A8B4C8] text-xs">
          Demo model. Illustrative policies. Not legal advice. Confidence scores reflect model
          calibration, not legal certainty.
        </div>

        {/* Filter indicator */}
        {filterPolicyIds?.length ? (
          <div className="mx-6 mt-2 flex items-center gap-2">
            <span className="text-[10px] text-[#8899B2] uppercase tracking-wider">Filtered to:</span>
            <div className="flex gap-1 flex-wrap">
              {filterPolicyIds.map((id) => (
                <span
                  key={id}
                  className="text-[10px] font-mono text-[#C4B5FD] bg-[#14122A] px-1.5 py-0.5 rounded border border-[#7B6FD4]/25"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Triggers */}
        <div className="px-6 py-4 space-y-4 flex-1">
          {visibleTriggers.length === 0 ? (
            <div className="text-[#8899B2] text-sm text-center py-8">
              {filterPolicyIds?.length
                ? 'No matching policy triggers found for this threshold'
                : 'No policy triggers in current simulation'}
            </div>
          ) : (
            visibleTriggers.map((trigger) => {
              const sev = severityConfig[trigger.severity];
              const triggerEvidence = trigger.evidenceIds
                .map((id) => evidenceMap.get(id))
                .filter(Boolean) as Evidence[];

              return (
                <div
                  key={`${trigger.policyId}-${trigger.country ?? 'global'}`}
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: sev.border }}
                >
                  {/* Policy header */}
                  <div className="px-4 py-3" style={{ background: sev.bg }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
                            style={{
                              color: sev.color,
                              background: `${sev.color}18`,
                              border: `1px solid ${sev.border}`,
                            }}
                          >
                            {trigger.policyId}
                          </span>
                          <span
                            className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded"
                            style={{ color: sev.color }}
                          >
                            {sev.label}
                          </span>
                          {trigger.country && (
                            <span className="text-[10px] text-[#A8B4C8] px-2 py-0.5 rounded bg-[#1A1F35]">
                              {trigger.country}
                            </span>
                          )}
                        </div>
                        <div className="text-[#EDF0F7] text-sm font-medium mt-1.5 leading-snug">
                          {trigger.title}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[10px] text-[#A8B4C8]">Confidence</div>
                        <div className="text-sm font-semibold" style={{ color: sev.color }}>
                          {Math.round(trigger.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-[#A8B4C8] text-xs mt-2 leading-relaxed">
                      {trigger.description}
                    </div>
                  </div>

                  {/* Evidence */}
                  {triggerEvidence.length > 0 && (
                    <div className="bg-[#1A1F35] px-4 py-3 space-y-2">
                      <div className="text-[10px] text-[#8899B2] uppercase tracking-wider font-medium">
                        Evidence Basis
                      </div>
                      {triggerEvidence.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 text-[10px] font-mono text-[#C4B5FD] bg-[#14122A] px-1.5 py-0.5 rounded border border-[#7B6FD4]/25 mt-0.5">
                            {ev.id}
                          </span>
                          <p className="text-[#A8B4C8] text-xs leading-relaxed">{ev.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0F1117] border-t border-[#2D3450] px-6 py-3">
          <div className="text-[#8899B2] text-[10px] text-center">
            Policy IDs are illustrative identifiers only. No statutory citations.
          </div>
        </div>
      </div>
    </div>
  );
}
