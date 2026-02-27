'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ScenarioEvaluation } from '@/engine/types';

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

interface AICopilotProps {
  evaluation: ScenarioEvaluation | null;
}

const QUICK_PROMPTS = [
  'What is the biggest risk?',
  'What should I do first?',
  'Explain the WFS score',
  'How can I reduce liability?',
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#FC8181',
  HIGH: '#FB923C',
  MEDIUM: '#FCD34D',
  LOW: '#4ADE9A',
};

const btnFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B6FD4] ' +
  'focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117]';

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

export default function AICopilot({ evaluation }: AICopilotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || isLoading) return;
    if (!evaluation) return;

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
        content: data.summary ?? '',
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
          <h2 className="text-[#F1F5F9] text-sm font-semibold">AI Copilot</h2>
        </div>
        <p className="text-[#8899B2] text-xs mt-0.5 ml-4">
          {evaluation
            ? 'Simulation loaded · Ask anything about it'
            : 'Run simulation to enable copilot'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-3 opacity-30">🤖</div>
            <p className="text-[#8899B2] text-xs leading-relaxed">
              {evaluation
                ? 'Ask a question or use a quick prompt below'
                : 'Run a simulation first — the copilot can only narrate what the engine produces'}
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
                  msg.error
                    ? 'border-[#FC8181]/25'
                    : 'bg-[#1A1F35] border-[#2D3450]'
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
          Copilot only narrates engine output · Cites evidence IDs · Not legal advice
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
            placeholder={evaluation ? 'Ask about this scenario…' : 'Run simulation first…'}
            disabled={!evaluation || isLoading}
            className={`flex-1 bg-[#1A1F35] border border-[#2D3450] rounded-xl px-3 py-2.5 text-[#EDF0F7] text-xs placeholder-[#8899B2] focus:outline-none focus:border-[#7B6FD4] focus-visible:ring-2 focus-visible:ring-[#7B6FD4] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0F1117] disabled:opacity-40 transition-colors`}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className={`flex-shrink-0 rounded-xl px-3 py-2.5 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${btnFocus}`}
            style={{
              background: canSend ? '#7B6FD4' : '#1A1F35',
              color: canSend ? 'white' : '#8899B2',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
