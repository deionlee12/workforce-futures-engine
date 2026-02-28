'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    setCoords(null);
    setVisible(true);
  };
  const hide = () => setVisible(false);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const gap = 8;
    const edge = 8;

    if (position === 'right') {
      const rightCandidate = triggerRect.right + gap;
      const leftCandidate = triggerRect.left - tooltipRect.width - gap;
      const left = rightCandidate + tooltipRect.width > viewportW - edge
        ? Math.max(edge, leftCandidate)
        : rightCandidate;
      const top = Math.min(
        viewportH - tooltipRect.height - edge,
        Math.max(edge, triggerRect.top + (triggerRect.height - tooltipRect.height) / 2),
      );
      setCoords({ top, left });
      return;
    }

    let top = triggerRect.top - tooltipRect.height - gap;
    if (top < edge) top = triggerRect.bottom + gap;
    const left = Math.min(
      viewportW - tooltipRect.width - edge,
      Math.max(edge, triggerRect.left + (triggerRect.width - tooltipRect.width) / 2),
    );
    setCoords({ top, left });
  }, [position]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition, content]);

  useEffect(() => {
    if (!visible) return;
    const syncPosition = () => updatePosition();
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);
    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [visible, updatePosition]);

  const canPortal = typeof document !== 'undefined';

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
    <span ref={triggerRef} className="inline-flex items-center">
      {trigger}
      {canPortal && visible && createPortal((
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          aria-hidden={!visible || !coords}
          className={`fixed z-[200] w-56 rounded-lg border border-[#2D3450] bg-[#1A1F35] px-3 py-2 text-[#C4B5FD] text-[11px] leading-relaxed shadow-xl transition-opacity duration-150 pointer-events-none ${
            visible && coords ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            visibility: coords ? 'visible' : 'hidden',
          }}
        >
          {content}
        </span>
      ), document.body)}
    </span>
  );
}
