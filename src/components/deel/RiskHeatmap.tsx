'use client';

import React from 'react';
import type { HeatmapCell, CountryCode, EventType } from '@/engine/types';

interface RiskHeatmapProps {
  cells: HeatmapCell[];
}

const EVENT_LABELS: Record<EventType, string> = {
  contractor_conversion: 'Conversion',
  termination: 'Termination',
  relocation: 'Relocation',
  eor_onboarding: 'EOR Onboard',
};

const COUNTRY_LABELS: Record<CountryCode, string> = {
  ES: 'Spain',
  DE: 'Germany',
  GB: 'UK',
  US: 'United States',
};

function getRiskColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 75)
    return { bg: '#1F1214', text: '#FC8181', border: 'rgba(239,68,68,0.45)' };
  if (score >= 55)
    return { bg: '#1E160F', text: '#FB923C', border: 'rgba(249,115,22,0.45)' };
  if (score >= 35)
    return { bg: '#1D1A0F', text: '#FCD34D', border: 'rgba(245,158,11,0.4)' };
  return { bg: '#0F1A17', text: '#4ADE9A', border: 'rgba(74,222,154,0.35)' };
}

export default function RiskHeatmap({ cells }: RiskHeatmapProps) {
  if (cells.length === 0) {
    return (
      <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-8 text-center text-[#8899B2] text-sm">
        Run simulation to see risk heatmap
      </div>
    );
  }

  const countries = [...new Set(cells.map((c) => c.country))];
  const eventTypes = [...new Set(cells.map((c) => c.eventType))];

  return (
    <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2D3450] flex items-center justify-between">
        <span className="text-xs text-[#A8B4C8] uppercase tracking-wider font-medium">Risk Heatmap</span>
        <div className="flex items-center gap-3 text-[10px] text-[#8899B2]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#4ADE9A] opacity-70" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#FCD34D] opacity-70" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#FB923C] opacity-70" /> High
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#FC8181] opacity-70" /> Critical
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-[#8899B2] font-medium">Country</th>
              {eventTypes.map((et) => (
                <th key={et} className="px-3 py-2 text-center text-[#8899B2] font-medium whitespace-nowrap">
                  {EVENT_LABELS[et] ?? et}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map((country) => (
              <tr key={country} className="border-t border-[#252B45]">
                <td className="px-4 py-2.5 text-[#A8B4C8] font-medium whitespace-nowrap">
                  {COUNTRY_LABELS[country] ?? country}
                </td>
                {eventTypes.map((et) => {
                  const cell = cells.find((c) => c.country === country && c.eventType === et);
                  if (!cell) {
                    return (
                      <td key={et} className="px-3 py-2.5 text-center text-[#2D3450]">
                        —
                      </td>
                    );
                  }
                  const { bg, text, border } = getRiskColor(cell.riskScore);
                  return (
                    <td key={et} className="px-3 py-2.5 text-center">
                      <span
                        className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 font-semibold tabular-nums text-xs"
                        style={{ background: bg, color: text, border: `1px solid ${border}` }}
                      >
                        {cell.riskScore}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
