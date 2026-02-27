'use client';

import React, { useState, useId } from 'react';

interface TooltipProps {
  content: string;
  position?: 'above' | 'right';
  children: React.ReactElement<{
    'aria-describedby'?: string;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
  }>;
}

export default function Tooltip({ content, children, position = 'above' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const trigger = React.cloneElement(children, {
    'aria-describedby': tooltipId,
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      children.props.onBlur?.(e);
    },
  });

  return (
    <span className="relative inline-flex items-center">
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!visible}
        className={`absolute z-50 w-56 rounded-lg border border-[#2D3450] bg-[#1A1F35] px-3 py-2 text-[#C4B5FD] text-[11px] leading-relaxed shadow-xl transition-opacity duration-150 pointer-events-none ${
          visible ? 'opacity-100' : 'opacity-0'
        } ${
          position === 'above'
            ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
            : 'left-full ml-2 top-1/2 -translate-y-1/2'
        }`}
      >
        {content}
        {position === 'above' && (
          <span
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #2D3450',
            }}
          />
        )}
      </span>
    </span>
  );
}
