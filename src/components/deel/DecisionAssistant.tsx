'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ScenarioEvaluation, ExecBrief } from '@/engine/types';

interface DecisionAssistantProps {
  evaluation: ScenarioEvaluation | null;
  initialBrief: ExecBrief | null;
  isBriefLoading: boolean;
  activeView: 'executive' | 'operator';
  liveOFS: number | null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  structured?: {
    summary: string;
    topRisks: Array<{ severity: string; title: string; evidenceIds: string[] }>;
    stagingPlan: string[];
    dataGaps: string[];
    execSentence: string;
  };
  error?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  'What is the dominant risk driver?',
  'What should I act on first?',
  'Explain the OFS score',
  'How can I reduce the liability tail?',
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#FC8181',
  HIGH: '#FB923C',
  MEDIUM: '#FCD34D',
  LOW: '#4ADE9A',
};

const DRIVER_COLORS: Record<string, string> = {
  Exposure: '#FC8181',
  Governance: '#FB923C',
  Execution: '#FCD34D',
  Confidence: '#7DD3FC',
};

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

// ── Structured response renderer (Operator view) ───────────────────────────────

function StructuredResponse({ msg }: { msg: Message }) {
  if (!msg.structured) return null;
  const s = msg.structured;
  return (
    <div className="space-y-3">
      {/* Summary */}
      <p className="text-[#C4B5FD] text-xs leading-relaxed italic border-l-2 border-[#7B6FD4]/50 pl-2">
        {s.summary}
      </p>

      {/* Top Risks */}
      {s.topRisks && s.topRisks.length > 0 && (
        <div>
          <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium mb-1.5">
            Top Risks
          </div>
          <div className="space-y-1">
            {s.topRisks.map((r, i) => (
              <div
                key={i}
                className="rounded-lg px-2.5 py-1.5 border flex items-start gap-2"
                style={{
                  background: `${SEVERITY_COLORS[r.severity] ?? '#A8B4C8'}12`,
                  borderColor: `${SEVERITY_COLORS[r.severity] ?? '#A8B4C8'}28`,
                }}
              >
                <span
                  className="text-[9px] uppercase font-semibold flex-shrink-0 mt-0.5"
                  style={{ color: SEVERITY_COLORS[r.severity] ?? '#A8B4C8' }}
                >
                  {r.severity}
                </span>
                <div className="min-w-0">
                  <div className="text-[#EDF0F7] text-xs leading-snug">{r.title}</div>
                  {r.evidenceIds?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {r.evidenceIds.map((id) => (
                        <span
                          key={id}
                          className="text-[9px] font-mono text-[#C4B5FD] bg-[#14122A] px-1 py-0.5 rounded border border-[#7B6FD4]/30"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staging Plan */}
      {s.stagingPlan && s.stagingPlan.length > 0 && (
        <div>
          <div className="text-[10px] text-[#C4B5FD] uppercase tracking-wider font-medium mb-1.5">
            Staging Plan
          </div>
          <ol className="space-y-1">
            {s.stagingPlan.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#A8B4C8] leading-relaxed">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1A1F35] text-[#C4B5FD] text-[9px] flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Exec sentence */}
      {s.execSentence && (
        <div className="rounded-lg bg-[#1A1F35] border border-[#2D3450] px-3 py-2">
          <div className="text-[10px] text-[#8899B2] uppercase tracking-wider font-medium mb-1">
            Executive Summary
          </div>
          <p className="text-[#EDF0F7] text-xs leading-relaxed font-medium">{s.execSentence}</p>
        </div>
      )}
    </div>
  );
}

// ── Executive Brief Panel ──────────────────────────────────────────────────────

function ExecutiveBriefPanel({
  brief,
  isLoading,
  liveOFS,
}: {
  brief: ExecBrief | null;
  isLoading: boolean;
  liveOFS: number | null;
}) {
  if (isLoading) {
    return (
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 bg-[#7B6FD4] rounded-full animate-pulse" />
          <span className="text-[#A8B4C8] text-xs">Generating executive brief…</span>
        </div>
        <div className="space-y-3">
          {[1, 0.8, 0.65, 0.85, 0.5].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-[#1A1F35] rounded animate-pulse"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-2xl mb-3 opacity-20">🧠</div>
          <p className="text-[#8899B2] text-xs leading-relaxed">
            Preview impact to generate executive brief
          </p>
        </div>
      </div>
    );
  }

  const driverColor = DRIVER_COLORS[brief.dominantDriver] ?? '#A8B4C8';
  const displayOFS = liveOFS ?? brief.ofScore;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* OFS badge + dominant driver */}
      <div className="flex items-center gap-3">
        <div
          className="rounded-xl px-4 py-2 text-center"
          style={{ background: `${driverColor}12`, border: `1px solid ${driverColor}25` }}
        >
          <div className="text-2xl font-bold tabular-nums" style={{ color: driverColor }}>
            {Math.round(displayOFS)}
          </div>
          <div className="text-[10px] text-[#8899B2] mt-0.5">OFS</div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-[#8899B2] uppercase tracking-wider mb-1">Dominant Driver</div>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-lg"
            style={{ color: driverColor, background: `${driverColor}18`, border: `1px solid ${driverColor}30` }}
          >
            {brief.dominantDriver}
          </span>
          <div className="text-[10px] text-[#8899B2] mt-1">
            Input confidence: {Math.round(brief.inputConfidence)}%
          </div>
        </div>
      </div>

      {/* Scenario summary */}
      <div>
        <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-1.5">
          Scenario Summary
        </div>
        <p className="text-[#EDF0F7] text-xs leading-relaxed">{brief.scenarioSummary}</p>
      </div>

      {/* Exec brief */}
      <div className="rounded-xl border border-[#2D3450] bg-[#1A1F35] px-4 py-3">
        <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-2">
          Executive Brief
        </div>
        <p className="text-[#EDF0F7] text-xs leading-relaxed">{brief.execBrief}</p>
      </div>

      {/* Tradeoff */}
      {brief.tradeoffIdentified && (
        <div className="rounded-xl border border-[#FCD34D]/25 bg-[#1D1A0F] px-4 py-3">
          <div className="text-[10px] text-[#FCD34D] uppercase tracking-wider font-medium mb-1.5">
            Key Tradeoff
          </div>
          <p className="text-[#EDF0F7] text-xs leading-relaxed">{brief.tradeoffIdentified}</p>
        </div>
      )}

      {/* Recommended sequencing */}
      {brief.recommendedSequencing?.length > 0 && (
        <div>
          <div className="text-[10px] text-[#A8B4C8] uppercase tracking-wider font-medium mb-1.5">
            Recommended Sequencing
          </div>
          <ol className="space-y-1">
            {brief.recommendedSequencing.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#A8B4C8] leading-relaxed">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#1A1F35] border border-[#2D3450] text-[#C4B5FD] text-[9px] flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Data required */}
      {brief.dataRequired?.length > 0 && (
        <div className="rounded-xl border border-[#FCD34D]/20 bg-[#1D1A0F] px-4 py-3">
          <div className="text-[10px] text-[#FCD34D] uppercase tracking-wider font-medium mb-1.5">
            Data Required to Improve Confidence
          </div>
          <ul className="space-y-1">
            {brief.dataRequired.map((d, i) => (
              <li key={i} className="text-xs text-[#A8B4C8] flex items-start gap-1.5">
                <span className="text-[#FCD34D]/60 flex-shrink-0 mt-0.5">·</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Q&A Chat Panel (Operator view) ────────────────────────────────────────────

function QAChatPanel({ evaluation }: { evaluation: ScenarioEvaluation | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading || !evaluation) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, evaluation }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${err.error ?? 'Request failed'}`,
            error: true,
          },
        ]);
        return;
      }

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.summary ?? data.execBrief ?? '',
        structured: data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.', error: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const canSend = !!evaluation && !isLoading && input.trim().length > 0;

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-3 opacity-30">💬</div>
            <p className="text-[#8899B2] text-xs leading-relaxed">
              {evaluation
                ? 'Ask a question or use a quick prompt below'
                : 'Run a simulation first — the assistant can only narrate what the engine produces'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-[#14122A] border border-[#7B6FD4]/40 px-3 py-2">
                <p className="text-[#EDF0F7] text-xs leading-relaxed">{msg.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[95%] rounded-xl rounded-tl-sm px-3 py-3 border ${
                  msg.error ? 'border-[#FC8181]/25' : 'bg-[#1A1F35] border-[#2D3450]'
                }`}
                style={msg.error ? { background: '#1F1214' } : {}}
              >
                {msg.structured && !msg.error ? (
                  <StructuredResponse msg={msg} />
                ) : (
                  <p
                    className={`text-xs leading-relaxed ${
                      msg.error ? 'text-[#FC8181]' : 'text-[#A8B4C8]'
                    }`}
                  >
                    {msg.content}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-tl-sm bg-[#1A1F35] border border-[#2D3450] px-4 py-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#7B6FD4] rounded-full animate-pulse" />
              <span className="inline-block w-2 h-2 bg-[#7B6FD4] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="inline-block w-2 h-2 bg-[#7B6FD4] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {evaluation && messages.length === 0 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="text-[10px] text-[#8899B2] uppercase tracking-wider font-medium mb-2">
            Quick Prompts
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={isLoading}
                className={`text-left rounded-lg border border-[#2D3450] hover:border-[#7B6FD4]/50 bg-[#1A1F35] hover:bg-[#1E2340] px-2.5 py-2 text-[#A8B4C8] hover:text-[#C4B5FD] text-xs transition-all leading-snug ${btnFocus}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 pb-2 flex-shrink-0">
        <p className="text-[#7A8AA3] text-[10px] text-center leading-relaxed">
          Narrates engine output · Cites evidence IDs · Not legal advice
        </p>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={evaluation ? 'Ask about this scenario…' : 'Preview impact first…'}
            disabled={!evaluation || isLoading}
            className="flex-1 bg-[#1A1F35] border border-[#2D3450] rounded-xl px-3 py-2.5 text-[#EDF0F7] text-xs placeholder-[#8899B2] focus:outline-none focus:border-[#7B6FD4] focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] disabled:opacity-40 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className={`flex-shrink-0 rounded-xl px-3 py-2.5 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnFocus}`}
            style={{
              background: canSend ? '#7B6FD4' : '#1A1F35',
              color: canSend ? 'white' : '#8899B2',
            }}
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DecisionAssistant({
  evaluation,
  initialBrief,
  isBriefLoading,
  activeView,
  liveOFS,
}: DecisionAssistantProps) {

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2D3450] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: evaluation ? '#4ADE9A' : '#8899B2',
              boxShadow: evaluation ? '0 0 6px #4ADE9A70' : 'none',
            }}
          />
          <h2 className="text-[#F1F5F9] text-sm font-semibold">Decision Assistant</h2>
        </div>
        <p className="text-[#8899B2] text-xs mt-0.5 ml-4">
          {activeView === 'executive'
            ? evaluation
              ? 'Executive brief · Impact active'
              : 'Preview impact to generate brief'
            : evaluation
            ? 'Q&A mode · Ask anything about this scenario'
            : 'Preview impact to enable Q&A'}
        </p>
      </div>

      {/* Executive view: auto-brief panel */}
      {activeView === 'executive' && (
        <ExecutiveBriefPanel
          brief={initialBrief}
          isLoading={isBriefLoading}
          liveOFS={liveOFS}
        />
      )}

      {/* Operator view: Q&A chat */}
      {activeView === 'operator' && (
        <QAChatPanel evaluation={evaluation} />
      )}
    </div>
  );
}
