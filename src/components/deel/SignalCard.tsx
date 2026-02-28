'use client';

import React from 'react';
import Tooltip from '@/components/Tooltip';

interface SignalCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'neutral' | 'purple' | 'green' | 'yellow' | 'red' | 'orange';
  icon?: React.ReactNode;
  modeled?: boolean;
  tooltip?: string;
  labelClassName?: string;
}

const accentBorder: Record<string, string> = {
  neutral: 'border-[#2D3450]',
  purple: 'border-[#7B6FD4]',
  green: 'border-[#4ADE9A]',
  yellow: 'border-[#F59E0B]',
  red: 'border-[#EF4444]',
  orange: 'border-[#F97316]',
};

const valueClasses: Record<string, string> = {
  neutral: 'text-[#F1F5F9]',
  purple: 'text-[#C4B5FD]',
  green: 'text-[#4ADE9A]',
  yellow: 'text-[#FCD34D]',
  red: 'text-[#FC8181]',
  orange: 'text-[#FB923C]',
};

const infoButtonClass =
  'flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md border border-[#2D3450] ' +
  'bg-[#141829]/60 text-white/70 hover:text-white/95 hover:bg-[#1A1F35] hover:border-[#3D4668] ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] leading-none text-[11px]';

export default function SignalCard({
  label,
  value,
  sub,
  accent = 'neutral',
  icon,
  modeled,
  tooltip,
  labelClassName,
}: SignalCardProps) {
  return (
    <div
      className={`rounded-xl bg-[#1A1F35] border ${accentBorder[accent]} px-4 py-3 flex flex-col gap-1 min-w-0`}
    >
      <div className="flex items-center gap-1.5 text-[#A8B4C8] text-xs font-medium uppercase tracking-wider">
        {icon && <span className="opacity-70">{icon}</span>}
        <span className={labelClassName ?? 'flex-1 truncate'}>{label}</span>
        {tooltip && (
          <Tooltip content={tooltip} position="above">
            <button
              className={infoButtonClass}
              aria-label={`Definition: ${label}`}
            >
              ℹ
            </button>
          </Tooltip>
        )}
        {modeled && (
          <span className="flex-shrink-0 text-[10px] font-normal normal-case tracking-normal text-[#8899B2] bg-[#252B45] px-1.5 py-0.5 rounded">
            modeled
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold tabular-nums leading-tight ${valueClasses[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-[#A8B4C8] text-xs leading-snug">{sub}</div>}
    </div>
  );
}
