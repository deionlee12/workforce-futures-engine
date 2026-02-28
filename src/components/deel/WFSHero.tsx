'use client';

import React, { useEffect, useState } from 'react';
import Tooltip from '@/components/Tooltip';
import type { OFSComponentScores } from '@/engine/types';

interface OFSHeroProps {
  ofs: number;
  gli: number;
  componentScores?: OFSComponentScores;
}

function getOFSLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'Critical Friction', color: '#FC8181', bg: '#1F1214' };
  if (score >= 55) return { label: 'Elevated Operational Risk', color: '#FB923C', bg: '#1E160F' };
  if (score >= 35) return { label: 'Moderate Friction', color: '#FCD34D', bg: '#1D1A0F' };
  return { label: 'Low Friction', color: '#4ADE9A', bg: '#0F1A17' };
}

function Arc({ score, color }: { score: number; color: string }) {
  return (
    <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
      {/* Track */}
      <path
        d="M 10 75 A 60 60 0 0 1 130 75"
        fill="none"
        stroke="#252B45"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d="M 10 75 A 60 60 0 0 1 130 75"
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * 188.5} 188.5`}
      />
    </svg>
  );
}

interface ComponentBarProps {
  label: string;
  value: number;
  color: string;
  weight: string;
}

function ComponentBar({ label, value, color, weight }: ComponentBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-[#8899B2] w-16 flex-shrink-0 uppercase tracking-wider leading-tight">
        {label}
      </span>
      <div className="flex-1 h-1 rounded-full bg-[#252B45] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, value)}%`,
            background: `${color}D9`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span className="text-[8px] tabular-nums text-[#8899B2] w-6 text-right">{Math.round(value)}</span>
      <span className="text-[8px] text-[#8899B2] w-5">{weight}</span>
    </div>
  );
}

export default function OFSHero({ ofs, gli, componentScores }: OFSHeroProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const { label, color, bg } = getOFSLabel(ofs);
  const infoButtonClass =
    'flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md border border-[#2D3450] ' +
    'bg-[#141829]/60 text-white/70 hover:text-white/95 hover:bg-[#1A1F35] hover:border-[#3D4668] ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
    'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] leading-none';

  useEffect(() => {
    let rafId = 0;
    let startTime = 0;
    const duration = 800;

    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimatedScore(ofs * progress);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [ofs]);

  return (
    <div
      className="rounded-xl border border-[#2D3450] px-5 py-4"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative flex-shrink-0 flex flex-col items-center">
          <Arc score={animatedScore} color={color} />
          <div className="absolute bottom-0 text-center">
            <div className="text-4xl font-extrabold tabular-nums" style={{ color }}>
              {Math.round(animatedScore)}
            </div>
            <div className="text-[10px] text-[#A8B4C8] uppercase tracking-widest">/ 100</div>
          </div>
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-[#A8B4C8] uppercase tracking-wider font-medium">
            Workforce Friction Score (WFS)
            <Tooltip
              content="Weighted composite 0–100: Tax Presence Exposure · Employment Status Exposure · Governance Load · Execution Cluster Risk. Higher = more workforce friction."
              position="above"
            >
              <button
                className={`${infoButtonClass} text-[11px]`}
                aria-label="Definition: Workforce Friction Score (WFS)"
              >
                ℹ
              </button>
            </Tooltip>
          </div>
          <div className="text-lg font-semibold leading-tight" style={{ color }}>
            {label}
          </div>
          <div className="text-xs text-[#C7D2FE]">
            Primary driver: Tax + Employment Exposure
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-[9px] text-[#A8B4C8] uppercase tracking-wider">
                Governance Load (GLI)
                <Tooltip
                  content="Governance Load Index: policy volume × complexity for countries in scope. Reflects regulatory burden, not legal certainty."
                  position="right"
                >
                  <button
                    className={`${infoButtonClass} text-[10px]`}
                    aria-label="Definition: Governance Load Index"
                  >
                    ℹ
                  </button>
                </Tooltip>
              </span>
              <span className="text-xs font-semibold text-[#A8B4C8]">{gli}/100</span>
            </div>
            <div className="h-6 w-px bg-[#2D3450]" />
            <div className="text-[9px] text-[#8899B2]/65 italic">
              Preview build · Modeled scenario
            </div>
          </div>
        </div>
      </div>

      {/* Component breakdown bars */}
      {componentScores && (
        <div className="mt-3 pt-3 border-t border-[#2D3450]/90 space-y-1.5">
          <div className="text-[8px] text-[#8899B2] uppercase tracking-wider font-medium mb-1.5">
            WFS Component Breakdown
          </div>
          <ComponentBar
            label="Exposure"
            value={componentScores.exposureScore}
            color="#FC8181"
            weight="×0.40"
          />
          <ComponentBar
            label="Governance"
            value={componentScores.governanceLoad}
            color="#FB923C"
            weight="×0.30"
          />
          <ComponentBar
            label="Execution"
            value={componentScores.executionClusterRisk}
            color="#FCD34D"
            weight="×0.20"
          />
          <ComponentBar
            label="Confidence"
            value={componentScores.confidencePenalty}
            color="#7DD3FC"
            weight="×0.10"
          />
        </div>
      )}
    </div>
  );
}
