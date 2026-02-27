export type CountryCode = 'ES' | 'DE' | 'GB' | 'US';
export type WorkerType = 'contractor' | 'eor_employee' | 'direct_employee';
export type EventType = 'contractor_conversion' | 'termination' | 'relocation' | 'eor_onboarding';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type JobFunction = 'Engineering' | 'Sales' | 'Operations' | 'Finance' | 'HR' | 'Marketing';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PCRLevel = 'Low' | 'Medium' | 'High';
export type DominantDriver = 'Exposure' | 'Governance' | 'Execution' | 'Confidence';

// ── OFS Weights ───────────────────────────────────────────────────────────────

export interface OFSWeights {
  exposure: number;    // default 0.40
  governance: number;  // default 0.30
  speed: number;       // default 0.20
  confidence: number;  // default 0.10
}

// ── OFS Component Scores ──────────────────────────────────────────────────────

export interface OFSComponentScores {
  /** 0–100: avg of Tax Presence Exposure + Employment Status Exposure (modeled) */
  exposureScore: number;
  /** 0–100: workflow complexity + unique approvers + policy family breadth */
  governanceLoad: number;
  /** 0–100: events per country-quarter weighted by event severity */
  executionClusterRisk: number;
  /** 0–100: % of required input fields present across all events */
  inputCompletenessScore: number;
  /** 100 − inputCompletenessScore */
  confidencePenalty: number;
}

// ── Scenario Inputs ───────────────────────────────────────────────────────────

export interface ScenarioEvent {
  id: string;
  country: CountryCode;
  workerType: WorkerType;
  eventType: EventType;
  jobFunction: JobFunction;
  quantity: number;
  timingQuarter: Quarter;
  avgAnnualSalaryUsd: number;
  destinationCountry?: CountryCode;
}

// ── Engine Outputs ────────────────────────────────────────────────────────────

export interface PolicyTrigger {
  policyId: string;
  title: string;
  family: string;
  severity: RiskSeverity;
  confidence: number;
  evidenceIds: string[];
  evidenceText: string;
  description: string;
  country?: CountryCode;
}

export interface ThresholdBreach {
  thresholdId: string;
  label: string;
  current: number;
  threshold: number;
  breached: boolean;
  country?: CountryCode;
  description: string;
}

export interface HeatmapCell {
  country: CountryCode;
  eventType: EventType;
  riskScore: number;
  label: string;
}

export interface WorkflowStep {
  stepId: string;
  title: string;
  owner: string;
  daysRequired: number;
  dependencies: string[];
  systemsTouched: string[];
  eventType: EventType;
}

export interface SignalSummary {
  totalCostImpact: number;
  headcountDelta: number;
  riskClusterCount: number;
  visaLoad: number;
  /** Operational Friction Score 0–100 (renamed from wfs) */
  ofs: number;
  /** Governance Load Index 0–100 */
  gli: number;
  /** Payroll Cycle Risk level */
  pcr: PCRLevel;
  liabilityTail: number;
  /** Tax Presence + Employment Status Exposure average 0–100 */
  exposureScore: number;
  /** Governance load normalized 0–100 */
  governanceLoad: number;
  /** Execution cluster risk 0–100 */
  executionClusterRisk: number;
  /** Input completeness 0–100 */
  inputCompletenessScore: number;
}

export interface Evidence {
  id: string;
  source: string;
  text: string;
  policyId?: string;
}

// ── Decision Assistant / Executive Brief ──────────────────────────────────────

export interface ExecBrief {
  scenarioSummary: string;
  ofScore: number;
  dominantDriver: DominantDriver;
  tradeoffIdentified: string;
  recommendedSequencing: string[];
  inputConfidence: number;
  dataRequired: string[];
  execBrief: string;
  // Legacy Q&A fields (backward-compat)
  summary?: string;
  topRisks?: Array<{ severity: string; title: string; evidenceIds: string[] }>;
  stagingPlan?: string[];
  dataGaps?: string[];
  execSentence?: string;
}

// ── Full Evaluation ───────────────────────────────────────────────────────────

export interface ScenarioEvaluation {
  id: string;
  createdAt: string;
  summary: string;
  signals: SignalSummary;
  heatmap: HeatmapCell[];
  thresholdBreaches: ThresholdBreach[];
  triggers: PolicyTrigger[];
  workflow: WorkflowStep[];
  evidence: Evidence[];
  dataGaps: string[];
  stagingSuggestion: string;
  /** OFS component scores — fixed for a given scenario, independent of weights */
  componentScores: OFSComponentScores;
  /** Weights used for this evaluation (stored for reference) */
  weights: OFSWeights;
}
