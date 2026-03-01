'use client';

import React, { useEffect, useState } from 'react';

interface MobileGateProps {
  children: React.ReactNode;
}

export default function MobileGate({ children }: MobileGateProps) {
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [openAnyway, setOpenAnyway] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrowViewport(window.innerWidth < 1024);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const showGate = isNarrowViewport && !openAnyway;
  if (!showGate) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-[#0A0C14] text-[#EDF0F7] flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#2D3450] bg-[#0F1117] shadow-[0_18px_48px_rgba(0,0,0,0.45)] p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Desktop recommended</h1>
          <p className="text-sm text-[#A8B4C8] leading-relaxed">
            This demo is a 3-panel decision workspace designed for a desktop viewport.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpenAnyway(true)}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white bg-[#7B6FD4] hover:bg-[#6D61C7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
          >
            Open anyway
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded-lg border border-[#2D3450] px-3.5 py-2 text-sm text-[#C7D2FE] hover:text-[#EDF0F7] hover:border-[#7B6FD4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]"
          >
            Copy link
          </button>
        </div>

        {copied && (
          <div className="rounded-md border border-[#4ADE9A]/35 bg-[#0F1A17] px-3 py-2 text-xs text-[#86EFAC]">
            Link copied
          </div>
        )}
      </div>
    </div>
  );
}
