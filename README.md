# Workforce Futures Engine

A deterministic workforce scenario simulation demo built with Next.js 14 (App Router), TypeScript, and Tailwind CSS. Deployed at route `/deel`.

> **Disclaimer:** Demo model. Illustrative policies only. All policy IDs (e.g., POL-PE-001) are fictional identifiers. No law citations, no statute names, no legal advice.

---

## Features

- **3-column command center:** Scenario Builder · Impact Analysis · AI Copilot
- **Deterministic simulation engine** — same inputs always produce same outputs
- **Workforce Friction Score (WFS 0–100)** hero card with arc gauge
- **Second-order signals:** Governance Load Index (GLI), Payroll Cycle Clustering Risk (PCR), Liability Tail
- **Risk heatmap** grid by country × event type
- **Required workflow steps** with owner, duration, systems touched
- **Explainability drawer** — policy triggers with evidence IDs and full evidence text
- **Architecture modal** — data flow diagram
- **3 Wow-button presets** that auto-load and auto-run scenarios
- **AI Copilot** — constrained OpenAI integration that only narrates the engine output

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000/deel](http://localhost:3000/deel) — root `/` redirects to `/deel` automatically.

---

## OpenAI API Key (Copilot)

The AI Copilot uses `gpt-4o-mini` via the OpenAI Chat Completions API.

**Without a key:** The copilot returns a structured mock response based on the engine output. All simulation features work normally.

**With a key:**

1. Create a `.env.local` file in the project root:
   ```
   OPENAI_API_KEY=sk-...your-key-here...
   ```
2. Restart the dev server.

The copilot is constrained by system prompt to:
- Only narrate the `ScenarioEvaluation` object
- Always cite evidence IDs (EVD-xxx)
- Never introduce new facts or cite actual laws
- Return structured JSON: `{ summary, topRisks, stagingPlan, dataGaps, execSentence }`

---

## Vercel Deployment

1. Push to a GitHub repository
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the environment variable:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-...your-key...`
4. Deploy — no build configuration needed (Next.js auto-detected)

---

## Example cURL — `/api/copilot`

```bash
curl -X POST http://localhost:3000/api/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the biggest risk in this scenario?",
    "evaluation": {
      "id": "abc123",
      "createdAt": "2024-01-01T00:00:00Z",
      "summary": "Scenario includes 12 contractor conversion events across ES, DE...",
      "signals": {
        "totalCostImpact": 340000,
        "headcountDelta": 12,
        "riskClusterCount": 4,
        "visaLoad": 0,
        "wfs": 72,
        "gli": 58,
        "pcr": "High",
        "liabilityTail": 189000
      },
      "heatmap": [],
      "thresholdBreaches": [],
      "triggers": [
        {
          "policyId": "POL-MC-001",
          "title": "Contractor Misclassification Screen",
          "family": "Misclassification",
          "severity": "HIGH",
          "confidence": 0.9,
          "evidenceIds": ["EVD-003", "EVD-004"],
          "evidenceText": "Illustrative: Batch conversions above 5 in a single quarter...",
          "description": "Illustrative: Contractors exhibiting employment indicators require reclassification review."
        }
      ],
      "workflow": [],
      "evidence": [],
      "dataGaps": ["Contractor engagement history not available."],
      "stagingSuggestion": "Sequence contractor conversions after entity readiness check."
    }
  }'
```

**Response shape:**
```json
{
  "summary": "Illustrative — not legal advice. The simulation activated 1 HIGH policy trigger (EVD-003, EVD-004)...",
  "topRisks": [
    {
      "severity": "HIGH",
      "title": "Contractor Misclassification Screen",
      "evidenceIds": ["EVD-003", "EVD-004"]
    }
  ],
  "stagingPlan": [
    "Sequence contractor conversions after entity readiness check."
  ],
  "dataGaps": ["Contractor engagement history not available."],
  "execSentence": "Scenario requires review of 1 policy trigger with HIGH severity before proceeding."
}
```

---

## Project Structure

```
src/
├── app/
│   ├── deel/
│   │   └── page.tsx              # Main 3-column layout (client)
│   ├── api/
│   │   └── copilot/
│   │       └── route.ts          # POST /api/copilot (OpenAI)
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                  # Redirects → /deel
├── components/
│   └── deel/
│       ├── ScenarioBuilder.tsx   # Left panel
│       ├── ImpactAnalysis.tsx    # Center panel
│       ├── AICopilot.tsx         # Right panel
│       ├── SignalCard.tsx        # Metric card
│       ├── WFSHero.tsx           # WFS arc gauge card
│       ├── RiskHeatmap.tsx       # Country × event grid
│       ├── WorkflowSteps.tsx     # Step list
│       ├── ArchitectureModal.tsx # Data flow diagram
│       └── ExplainabilityDrawer.tsx # Policy + evidence
├── engine/
│   ├── types.ts                  # All TypeScript interfaces
│   └── evaluateScenario.ts       # Deterministic engine
└── data/
    ├── countries.json            # peSensitivity, misclassSensitivity, benefitsTailMultiplier...
    ├── costMultipliers.json      # Event × country cost rates
    ├── policyRules.json          # Illustrative policy library (POL-PE-001 etc.)
    ├── thresholdDefinitions.json # Numeric thresholds by country
    └── workflowTemplates.json    # Step templates by event type
```

---

## Engine Architecture

```
Scenario Builder
      │
      ▼
evaluateScenario(events: ScenarioEvent[])
      │
      ├─ riskEngine()          → PolicyTrigger[]
      ├─ thresholdEngine()     → ThresholdBreach[]
      ├─ workflowOrchestrator() → WorkflowStep[]
      ├─ computeWFS()          → number (0–100)
      ├─ computeGLI()          → number (0–100)
      ├─ computePCR()          → 'Low'|'Medium'|'High'
      └─ computeLiabilityTail() → number (USD, modeled)
      │
      ▼
ScenarioEvaluation
      │
      ├─ Impact Analysis UI (signals, heatmap, workflow)
      ├─ Explainability Drawer (triggers + evidence)
      └─ /api/copilot → OpenAI (narrates evaluation only)
```

---

## Wow Buttons

| # | Label | Scenario |
|---|-------|----------|
| 1 | Convert 12 Contractors ES + DE | 6× contractor → employee Spain Q3 + 6× Germany Q3 |
| 2 | Relocate Team US → UK | 5× direct employee relocation Q2, equity friction |
| 3 | Terminate 5 EOR · Germany Q2 | Clustered exits, CRITICAL termination trigger |

---

*Demo model. Illustrative policies. Not legal advice.*
