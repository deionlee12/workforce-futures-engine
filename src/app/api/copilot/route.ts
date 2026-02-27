import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ScenarioEvaluation, ExecBrief } from '@/engine/types';

const SYSTEM_PROMPT = `You are the Workforce Decision Layer — Decision Assistant. You are a workforce operations analyst.

STRICT RULES — follow these without exception:
1. Analyze ONLY information present in the ScenarioEvaluation JSON. Do not introduce external facts, statistics, or legal context.
2. MUST cite evidence IDs (e.g., EVD-001, EVD-002) when making any risk statement.
3. MUST reference policy IDs (e.g., POL-PE-001) when discussing triggered policies.
4. MUST NOT cite any laws, statutes, regulatory codes, or legal authorities by name.
5. MUST NOT provide legal advice or conclusions. Use language like "the model flags", "the simulation indicates", "per the illustrative policy".
6. If the evaluation is missing information, reference the dataGaps array.
7. Always include "Illustrative — not legal advice" in the execBrief field.
8. Base inputConfidence only on the componentScores.inputCompletenessScore in the evaluation.
9. Identify the dominantDriver: the OFS component with the highest contribution (Exposure, Governance, Execution, or Confidence).
10. Tone: platform-native, analytical, not chatty. Speak as a workforce operations platform, not a human advisor.

Return a valid JSON object (no markdown, no code blocks, raw JSON):
{
  "scenarioSummary": "string — 1-2 sentences, cite evidence IDs",
  "ofScore": number — the OFS value from evaluation.signals.ofs,
  "dominantDriver": "Exposure" | "Governance" | "Execution" | "Confidence",
  "tradeoffIdentified": "string — the key tradeoff in this scenario",
  "recommendedSequencing": ["string — actionable step 1", "step 2", "step 3"],
  "inputConfidence": number — evaluation.componentScores.inputCompletenessScore,
  "dataRequired": ["string — missing data item 1", ...],
  "execBrief": "string — one sentence executive brief for CFO/CHRO. Must include Illustrative — not legal advice.",
  "summary": "string — 2-3 sentences for Q&A mode",
  "topRisks": [{"severity": "HIGH|CRITICAL|MEDIUM|LOW", "title": "string", "evidenceIds": ["EVD-xxx"]}],
  "stagingPlan": ["string — step 1", ...],
  "dataGaps": ["string — gap 1", ...],
  "execSentence": "string — one-line exec summary"
}`;

interface CopilotRequest {
  question: string;
  evaluation: ScenarioEvaluation;
  mode?: 'brief' | 'qa';
}

function buildMockResponse(evaluation: ScenarioEvaluation): ExecBrief {
  const s = evaluation.signals;
  const c = evaluation.componentScores;

  // Determine dominant driver
  const scores = {
    Exposure: c.exposureScore * evaluation.weights.exposure,
    Governance: c.governanceLoad * evaluation.weights.governance,
    Execution: c.executionClusterRisk * evaluation.weights.speed,
    Confidence: c.confidencePenalty * evaluation.weights.confidence,
  } as const;

  const dominantDriver = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  const highTriggers = evaluation.triggers.filter(
    (t) => t.severity === 'CRITICAL' || t.severity === 'HIGH'
  );
  const firstEvidenceId = highTriggers[0]?.evidenceIds?.[0] ?? 'EVD-001';

  const stagingSteps = evaluation.stagingSuggestion
    .split('. ')
    .filter(Boolean)
    .map((s) => s.trim() + (s.trim().endsWith('.') ? '' : '.'));

  return {
    scenarioSummary: `Illustrative — not legal advice. The simulation activated ${evaluation.triggers.length} policy triggers with ${highTriggers.length} at HIGH or CRITICAL severity (see ${firstEvidenceId}). Operational Friction Score is ${s.ofs}/100.`,
    ofScore: s.ofs,
    dominantDriver,
    tradeoffIdentified: dominantDriver === 'Exposure'
      ? `Speed-to-market conflicts with Tax Presence and Employment Status Exposure reduction — converting contractors before entity readiness increases exposure indicators.`
      : dominantDriver === 'Governance'
      ? `Policy family breadth (${new Set(evaluation.triggers.map((t) => t.family)).size} families) extends governance timeline and increases approval overhead.`
      : dominantDriver === 'Execution'
      ? `Event clustering across ${new Set(evaluation.workflow.map((w) => w.eventType)).size} event type(s) in compressed quarters increases payroll cycle risk.`
      : `Incomplete input data (${c.inputCompletenessScore}% complete) introduces ${c.confidencePenalty}-point uncertainty into the OFS calculation.`,
    recommendedSequencing: stagingSteps.slice(0, 3),
    inputConfidence: c.inputCompletenessScore,
    dataRequired: evaluation.dataGaps,
    execBrief: `Illustrative — not legal advice. Scenario carries OFS ${s.ofs}/100 driven by ${dominantDriver.toLowerCase()} factors; modeled cost impact $${s.totalCostImpact.toLocaleString()} across ${new Set(evaluation.workflow.map((w) => w.eventType)).size} event type(s) requiring ${evaluation.workflow.length} workflow steps.`,
    // Legacy Q&A fields
    summary: `Illustrative — not legal advice. The simulation activated ${evaluation.triggers.length} policy triggers including ${highTriggers.length} high-severity findings (see ${firstEvidenceId}). Operational Friction Score is ${s.ofs}/100.`,
    topRisks: evaluation.triggers.slice(0, 3).map((t) => ({
      severity: t.severity,
      title: t.title,
      evidenceIds: t.evidenceIds,
    })),
    stagingPlan: stagingSteps,
    dataGaps: evaluation.dataGaps,
    execSentence: `Scenario requires ${evaluation.workflow.length} workflow steps with OFS ${s.ofs}/100 and modeled cost impact of $${s.totalCostImpact.toLocaleString()}.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CopilotRequest;
    const { question, evaluation } = body;

    if (!question || !evaluation) {
      return NextResponse.json({ error: 'Missing question or evaluation' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(buildMockResponse(evaluation));
    }

    const client = new OpenAI({ apiKey });

    const userMessage = `Question: ${question}

ScenarioEvaluation (use ONLY this data):
${JSON.stringify(evaluation, null, 2)}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    let parsed: ExecBrief;

    try {
      parsed = JSON.parse(rawContent) as ExecBrief;
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawContent }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
