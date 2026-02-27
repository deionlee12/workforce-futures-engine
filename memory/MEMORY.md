# Workforce Futures Engine — Memory

## Project
- Route: /deel (root / redirects here)
- Stack: Next.js 16, TypeScript, Tailwind v4, OpenAI
- Tailwind v4: uses `@import "tailwindcss"` + `@theme inline {}` in globals.css
- Path alias: `@/*` → `./src/*`

## Key Files
- Engine: src/engine/evaluateScenario.ts + types.ts
- Data: src/data/ (countries, policyRules, costMultipliers, thresholdDefinitions, workflowTemplates)
- API: src/app/api/copilot/route.ts (OpenAI gpt-4o-mini, mock fallback if no key)
- Components: src/components/deel/
- Page: src/app/deel/page.tsx (client component, holds all state)

## Architecture
- evaluateScenario() is fully deterministic — same inputs → same outputs
- Copilot is constrained: only narrates ScenarioEvaluation, cites EVD-xxx, no law citations
- Mock copilot response returns if OPENAI_API_KEY is unset

## Colors (dark mode, Deel-ish)
- bg-base: #0A0C14, bg-surface: #0F1117, bg-elevated: #161B2E
- accent purple: #6D5FC7 (dim) / #A78BFA (light)
- border: #2D3148

## Verified Working
- All 3 wow buttons auto-load + auto-run scenarios
- WFS arc gauge renders correctly
- Architecture modal, Explainability drawer both open/close
- TypeScript: clean (0 errors)
- Console: 0 errors
