import type {
  ScenarioEvent,
  ScenarioEvaluation,
  PolicyTrigger,
  ThresholdBreach,
  HeatmapCell,
  WorkflowStep,
  Evidence,
  SignalSummary,
  PCRLevel,
  CountryCode,
  EventType,
  RiskSeverity,
  OFSWeights,
  OFSComponentScores,
  Quarter,
} from './types';

import countriesData from '../data/countries.json';
import costMultipliersData from '../data/costMultipliers.json';
import policyRulesData from '../data/policyRules.json';
import thresholdDefsData from '../data/thresholdDefinitions.json';
import workflowTemplatesData from '../data/workflowTemplates.json';

// ── Type casts for imported JSON ──────────────────────────────────────────────

type Countries = typeof countriesData;
type CountryEntry = Countries[keyof Countries];
const countries = countriesData as Record<CountryCode, CountryEntry>;

type PolicyRule = {
  id: string;
  title: string;
  family: string;
  countries: string[];
  eventTypes: string[];
  severity: RiskSeverity;
  confidence: number;
  description: string;
  thresholdKey: string;
  evidenceIds: string[];
};
const policyRules = policyRulesData as Record<string, PolicyRule>;

type ThresholdDef = {
  id: string;
  label: string;
  description: string;
  globalThreshold?: number;
  thresholdByCountry?: Record<string, number>;
};
const thresholdDefs = thresholdDefsData as Record<string, ThresholdDef>;

type CostMultipliers = typeof costMultipliersData;
const costMultipliers = costMultipliersData as CostMultipliers;

type WorkflowTemplate = Array<{
  stepId: string;
  title: string;
  owner: string;
  daysRequired: number;
  dependencies: string[];
  systemsTouched: string[];
}>;
const workflowTemplates = workflowTemplatesData as Record<string, WorkflowTemplate>;

// ── Default weights ───────────────────────────────────────────────────────────

export const DEFAULT_OFS_WEIGHTS: OFSWeights = {
  exposure: 0.40,
  governance: 0.30,
  speed: 0.20,
  confidence: 0.10,
};

// ── Evidence library ──────────────────────────────────────────────────────────

const evidenceLibrary: Evidence[] = [
  {
    id: 'EVD-001',
    source: 'POL-PE-001',
    policyId: 'POL-PE-001',
    text: 'Illustrative threshold model: 4+ in-country workers may constitute a taxable presence trigger. This is a modeled heuristic, not a legal determination.',
  },
  {
    id: 'EVD-002',
    source: 'POL-PE-001',
    policyId: 'POL-PE-001',
    text: 'Illustrative: Conversion of contractors to employed status in-country without a registered entity increases Tax Presence Exposure indicators in the model.',
  },
  {
    id: 'EVD-003',
    source: 'POL-MC-001',
    policyId: 'POL-MC-001',
    text: 'Illustrative: Economic-dependence criteria used in the model: exclusive engagement, direction and control, tool provision, integration into core operations.',
  },
  {
    id: 'EVD-004',
    source: 'POL-MC-001',
    policyId: 'POL-MC-001',
    text: 'Illustrative model flag: Batch conversions above 5 in a single quarter are scored as elevated Employment Status Exposure due to systemic pattern indicators.',
  },
  {
    id: 'EVD-005',
    source: 'POL-TRM-001',
    policyId: 'POL-TRM-001',
    text: 'Illustrative: The model applies a collective consultation flag when terminations in a single quarter exceed jurisdiction-specific thresholds (DE: 3, ES: 5).',
  },
  {
    id: 'EVD-006',
    source: 'POL-TRM-001',
    policyId: 'POL-TRM-001',
    text: 'Illustrative: Protected jurisdictions in the model require extended notice periods (DE: 120 days, ES: 90 days) factored into timeline and cost calculations.',
  },
  {
    id: 'EVD-007',
    source: 'POL-REL-001',
    policyId: 'POL-REL-001',
    text: 'Illustrative: UK inbound relocations flagged for right-to-work verification. GB is marked as visa-required in the country data model.',
  },
  {
    id: 'EVD-008',
    source: 'POL-REL-001',
    policyId: 'POL-REL-001',
    text: 'Illustrative: Shadow payroll analysis required when worker retains home-country tax residency during relocation. Applied to cross-border relocation events in model.',
  },
  {
    id: 'EVD-009',
    source: 'POL-EQ-001',
    policyId: 'POL-EQ-001',
    text: 'Illustrative: DE and GB are scored HIGH equity complexity in the model. Equity awards to workers in these jurisdictions trigger withholding review.',
  },
  {
    id: 'EVD-010',
    source: 'POL-EQ-001',
    policyId: 'POL-EQ-001',
    text: 'Illustrative: Cross-border equity events touching GB may require local securities filing review per model policy POL-EQ-001.',
  },
  {
    id: 'EVD-011',
    source: 'POL-BEN-001',
    policyId: 'POL-BEN-001',
    text: 'Illustrative: Benefits tail multiplier (DE: 0.40, ES: 0.35, GB: 0.25) applied to liability model. Represents estimated continuation obligations as a fraction of annual salary.',
  },
  {
    id: 'EVD-012',
    source: 'POL-BEN-001',
    policyId: 'POL-BEN-001',
    text: 'Illustrative: Termination events in protected jurisdictions trigger benefits wind-down scheduling step with average 5-day lead time in the workflow model.',
  },
  {
    id: 'EVD-013',
    source: 'POL-PAY-001',
    policyId: 'POL-PAY-001',
    text: 'Illustrative: Payroll cutoff days modeled per country (ES: 20th, DE: 25th, GB: 28th, US: 15th). Events landing within 5 days of cutoff are flagged as clustering risk.',
  },
  {
    id: 'EVD-014',
    source: 'POL-ENT-001',
    policyId: 'POL-ENT-001',
    text: 'Illustrative: EOR headcount approaching entity threshold (ES: 15, DE: 20, GB: 25) triggers entity formation review in the model.',
  },
];

// ── Helper utilities ──────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getCountryData(code: CountryCode): CountryEntry {
  return countries[code];
}

function getQuantityScalingMultiplier(qty: number): number {
  const { breakpoints, multipliers } = costMultipliers.quantityScaling;
  let multiplier = multipliers[0];
  for (let i = breakpoints.length - 1; i >= 0; i--) {
    if (qty >= breakpoints[i]) {
      multiplier = multipliers[i];
      break;
    }
  }
  return multiplier;
}

// ── Risk Engine ───────────────────────────────────────────────────────────────

function riskEngine(events: ScenarioEvent[]): PolicyTrigger[] {
  const triggeredMap = new Map<string, PolicyTrigger>();

  for (const event of events) {
    for (const [, policy] of Object.entries(policyRules)) {
      const countryMatch = policy.countries.includes(event.country);
      const eventTypeMatch = policy.eventTypes.includes(event.eventType);

      const destMatch =
        event.eventType === 'relocation' &&
        event.destinationCountry &&
        policy.countries.includes(event.destinationCountry);

      if ((countryMatch || destMatch) && eventTypeMatch) {
        const key = `${policy.id}-${event.country}`;
        if (!triggeredMap.has(key)) {
          triggeredMap.set(key, {
            policyId: policy.id,
            title: policy.title,
            family: policy.family,
            severity: policy.severity,
            confidence: policy.confidence,
            evidenceIds: policy.evidenceIds,
            evidenceText: policy.description,
            description: policy.description,
            country: event.country,
          });
        }
      }
    }
  }

  return Array.from(triggeredMap.values()).sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ── Threshold Engine ──────────────────────────────────────────────────────────

function thresholdEngine(events: ScenarioEvent[]): ThresholdBreach[] {
  const breaches: ThresholdBreach[] = [];

  // Contractor batch
  let totalContractorConversions = 0;
  for (const evt of events) {
    if (evt.eventType === 'contractor_conversion') totalContractorConversions += evt.quantity;
  }
  const cbThreshold = thresholdDefs['contractor_batch_size'];
  breaches.push({
    thresholdId: 'contractor_batch_size',
    label: cbThreshold.label,
    current: totalContractorConversions,
    threshold: cbThreshold.globalThreshold!,
    breached: totalContractorConversions >= cbThreshold.globalThreshold!,
    description: cbThreshold.description,
  });

  // Termination clusters per country
  const terminationByCountry = new Map<CountryCode, number>();
  for (const evt of events) {
    if (evt.eventType === 'termination') {
      terminationByCountry.set(evt.country, (terminationByCountry.get(evt.country) ?? 0) + evt.quantity);
    }
  }
  const trmThreshold = thresholdDefs['termination_cluster'];
  for (const [country, count] of terminationByCountry.entries()) {
    const threshold = trmThreshold.thresholdByCountry?.[country] ?? 20;
    breaches.push({
      thresholdId: 'termination_cluster',
      label: `${trmThreshold.label} (${country})`,
      current: count,
      threshold,
      breached: count >= threshold,
      country: country as CountryCode,
      description: trmThreshold.description,
    });
  }

  // Tax Presence worker count per country
  const workersByCountry = new Map<CountryCode, number>();
  for (const evt of events) {
    if (evt.eventType !== 'termination') {
      workersByCountry.set(evt.country, (workersByCountry.get(evt.country) ?? 0) + evt.quantity);
    }
  }
  const peDef = thresholdDefs['pe_worker_count'];
  for (const [country, count] of workersByCountry.entries()) {
    const threshold = peDef.thresholdByCountry?.[country] ?? 10;
    breaches.push({
      thresholdId: 'pe_worker_count',
      label: `${peDef.label} (${country})`,
      current: count,
      threshold,
      breached: count >= threshold,
      country: country as CountryCode,
      description: peDef.description,
    });
  }

  // Relocation count
  let totalRelocations = 0;
  for (const evt of events) {
    if (evt.eventType === 'relocation') totalRelocations += evt.quantity;
  }
  const relDef = thresholdDefs['relocation_count'];
  breaches.push({
    thresholdId: 'relocation_count',
    label: relDef.label,
    current: totalRelocations,
    threshold: relDef.globalThreshold!,
    breached: totalRelocations >= relDef.globalThreshold!,
    description: relDef.description,
  });

  // EOR-to-entity by country
  const eorByCountry = new Map<CountryCode, number>();
  for (const evt of events) {
    if (evt.eventType === 'eor_onboarding') {
      eorByCountry.set(evt.country, (eorByCountry.get(evt.country) ?? 0) + evt.quantity);
    }
  }
  const eorDef = thresholdDefs['eor_to_entity'];
  for (const [country, count] of eorByCountry.entries()) {
    const threshold = eorDef.thresholdByCountry?.[country] ?? 25;
    breaches.push({
      thresholdId: 'eor_to_entity',
      label: `${eorDef.label} (${country})`,
      current: count,
      threshold,
      breached: count >= threshold,
      country: country as CountryCode,
      description: eorDef.description,
    });
  }

  // Payroll cluster
  const pcrDef = thresholdDefs['payroll_cluster'];
  const payrollEvents = events.filter((e) =>
    ['contractor_conversion', 'eor_onboarding', 'termination'].includes(e.eventType)
  );
  const totalPayrollEvents = payrollEvents.reduce((sum, e) => sum + e.quantity, 0);
  breaches.push({
    thresholdId: 'payroll_cluster',
    label: pcrDef.label,
    current: payrollEvents.length,
    threshold: pcrDef.globalThreshold!,
    breached: totalPayrollEvents >= pcrDef.globalThreshold!,
    description: pcrDef.description,
  });

  return breaches;
}

// ── Workflow Orchestrator ─────────────────────────────────────────────────────

function workflowOrchestrator(events: ScenarioEvent[]): WorkflowStep[] {
  const seen = new Set<string>();
  const steps: WorkflowStep[] = [];
  const eventTypes = [...new Set(events.map((e) => e.eventType))];

  for (const eventType of eventTypes) {
    const template = workflowTemplates[eventType];
    if (!template) continue;
    for (const step of template) {
      if (!seen.has(step.stepId)) {
        seen.add(step.stepId);
        steps.push({ ...step, eventType });
      }
    }
  }

  return steps;
}

// ── Input Completeness (0–100) ────────────────────────────────────────────────
// Required fields per spec: entityPresence, roleAuthority, contractType,
// payrollCycleKnown, equityInvolved, historicalTenureMonths, exclusiveEngagement.
// Present in current form: contractType (workerType), payrollCycleKnown (timingQuarter),
// country, quantity, salary, jobFunction, eventType.

function computeInputCompleteness(events: ScenarioEvent[]): number {
  if (events.length === 0) return 0;
  let total = 0;

  for (const evt of events) {
    // Core fields always present (7 of 12 total data points)
    let present = 7;
    let required = 8; // base

    if (evt.eventType === 'relocation') {
      required = 9; // destinationCountry also required
      if (evt.destinationCountry) present += 1;
    }
    if (evt.eventType === 'contractor_conversion') {
      required = 10; // roleAuthority + exclusiveEngagement needed
    }
    if (evt.eventType === 'termination') {
      required = 9; // historicalTenureMonths needed
    }

    const cd = getCountryData(evt.country);
    if ((cd as { peSensitivity: number }).peSensitivity > 0.7) {
      required += 1; // entityPresence needed for high-PE countries
    }

    total += (present / required) * 100;
  }

  return Math.round(total / events.length);
}

// ── Tax Presence + Employment Status Exposure Score (0–100) ──────────────────

function computeExposureScore(
  events: ScenarioEvent[],
  triggers: PolicyTrigger[]
): number {
  if (events.length === 0) return 0;

  const eventWeights: Record<EventType, number> = {
    contractor_conversion: 1.0,
    termination: 0.6,
    relocation: 0.8,
    eor_onboarding: 0.4,
  };

  let totalPE = 0;
  let totalESE = 0;
  let weight = 0;

  for (const evt of events) {
    const cd = getCountryData(evt.country);
    const w = eventWeights[evt.eventType] ?? 0.5;
    const qtyFactor = Math.min(1 + evt.quantity * 0.04, 2.0);
    totalPE += (cd as { peSensitivity: number }).peSensitivity * w * qtyFactor;
    totalESE += (cd as { misclassSensitivity: number }).misclassSensitivity * w * qtyFactor;
    weight += w;
  }

  const avgPE = weight > 0 ? totalPE / weight : 0;
  const avgESE = weight > 0 ? totalESE / weight : 0;
  const baseScore = ((avgPE + avgESE) / 2) * 100;

  // Boost for CRITICAL exposure triggers
  const criticalCount = triggers.filter(
    (t) => (t.family === 'PE' || t.family === 'Misclassification') && t.severity === 'CRITICAL'
  ).length;

  return Math.min(Math.round(baseScore + criticalCount * 8), 100);
}

// ── Governance Load (0–100) ───────────────────────────────────────────────────

function computeGovernanceLoad(
  workflow: WorkflowStep[],
  triggers: PolicyTrigger[]
): number {
  if (workflow.length === 0) return 0;

  const approvalSteps = workflow.length;
  const systemsSet = new Set<string>();
  workflow.forEach((s) => s.systemsTouched.forEach((sys) => systemsSet.add(sys)));
  const uniqueSystems = systemsSet.size;
  const uniqueOwners = new Set(workflow.map((s) => s.owner)).size;
  const policyFamilies = new Set(triggers.map((t) => t.family)).size;

  const raw = approvalSteps * 2 + uniqueSystems * 3 + policyFamilies * 5 + uniqueOwners * 2;
  const maxPossible = 30 * 2 + 15 * 3 + 10 * 5 + 10 * 2;
  return Math.min(Math.round((raw / maxPossible) * 100), 100);
}

// ── Execution Cluster Risk (0–100) ────────────────────────────────────────────

function computeExecutionClusterRisk(
  events: ScenarioEvent[],
  triggers: PolicyTrigger[]
): number {
  if (events.length === 0) return 0;

  const eventWeights: Record<EventType, number> = {
    termination: 1.0,
    contractor_conversion: 0.8,
    relocation: 0.7,
    eor_onboarding: 0.4,
  };

  const clusterMap = new Map<string, number>();
  for (const evt of events) {
    const key = `${evt.country}::${evt.timingQuarter}`;
    const w = eventWeights[evt.eventType] ?? 0.5;
    clusterMap.set(key, (clusterMap.get(key) ?? 0) + evt.quantity * w);
  }

  let maxCluster = 0;
  for (const v of clusterMap.values()) {
    maxCluster = Math.max(maxCluster, v);
  }

  const highCritCount = triggers.filter(
    (t) => t.severity === 'HIGH' || t.severity === 'CRITICAL'
  ).length;

  const clusterScore = Math.min((maxCluster / 15) * 80, 80);
  const triggerBonus = Math.min(highCritCount * 4, 20);
  return Math.min(Math.round(clusterScore + triggerBonus), 100);
}

// ── OFS — Operational Friction Score (0–100) ──────────────────────────────────

function computeOFS(components: OFSComponentScores, weights: OFSWeights): number {
  const raw =
    components.exposureScore * weights.exposure +
    components.governanceLoad * weights.governance +
    components.executionClusterRisk * weights.speed +
    components.confidencePenalty * weights.confidence;
  return Math.min(Math.round(raw), 100);
}

/** Client-side recompute: recalculate OFS from stored component scores + new weights. */
export function computeOFSFromComponents(
  components: OFSComponentScores,
  weights: OFSWeights
): number {
  const raw =
    components.exposureScore * weights.exposure +
    components.governanceLoad * weights.governance +
    components.executionClusterRisk * weights.speed +
    components.confidencePenalty * weights.confidence;
  return Math.min(Math.round(raw), 100);
}

// ── GLI — Governance Load Index (kept for signal display) ────────────────────

function computeGLI(
  events: ScenarioEvent[],
  workflow: WorkflowStep[],
  triggers: PolicyTrigger[]
): number {
  if (events.length === 0) return 0;
  return computeGovernanceLoad(workflow, triggers);
}

// ── PCR – Payroll Cycle Clustering Risk ───────────────────────────────────────

function computePCR(events: ScenarioEvent[]): PCRLevel {
  const payrollEventTypes = new Set(['contractor_conversion', 'eor_onboarding', 'termination']);
  const clusterMap = new Map<string, number>();

  for (const evt of events) {
    if (payrollEventTypes.has(evt.eventType)) {
      const key = `${evt.country}::${evt.timingQuarter}`;
      clusterMap.set(key, (clusterMap.get(key) ?? 0) + evt.quantity);
    }
  }

  let maxCluster = 0;
  for (const count of clusterMap.values()) {
    maxCluster = Math.max(maxCluster, count);
  }

  if (maxCluster >= 8 || clusterMap.size >= 4) return 'High';
  if (maxCluster >= 4 || clusterMap.size >= 2) return 'Medium';
  return 'Low';
}

// ── Liability Tail ────────────────────────────────────────────────────────────

function computeLiabilityTail(events: ScenarioEvent[]): number {
  let total = 0;
  for (const evt of events) {
    if (evt.eventType === 'termination' || evt.eventType === 'contractor_conversion') {
      const country = getCountryData(evt.country);
      total += evt.avgAnnualSalaryUsd * evt.quantity * (country as { benefitsTailMultiplier: number }).benefitsTailMultiplier;
    }
  }
  return Math.round(total);
}

// ── Total Cost Impact ─────────────────────────────────────────────────────────

function computeTotalCost(events: ScenarioEvent[]): number {
  let total = 0;
  for (const evt of events) {
    const baseRates = (costMultipliers.eventTypeBase as Record<string, Record<string, number>>)[evt.eventType];
    const baseRate = baseRates?.[evt.country] ?? 0.15;
    const workerMult = (costMultipliers.workerTypeMultiplier as Record<string, number>)[evt.workerType] ?? 1.0;
    const qtyMult = getQuantityScalingMultiplier(evt.quantity);
    total += evt.avgAnnualSalaryUsd * evt.quantity * baseRate * workerMult * qtyMult;
  }
  return Math.round(total);
}

// ── Headcount Delta ───────────────────────────────────────────────────────────

function computeHeadcountDelta(events: ScenarioEvent[]): number {
  let delta = 0;
  for (const evt of events) {
    if (evt.eventType === 'contractor_conversion') delta += evt.quantity;
    else if (evt.eventType === 'termination') delta -= evt.quantity;
    else if (evt.eventType === 'eor_onboarding') delta += evt.quantity;
  }
  return delta;
}

// ── Visa Load ─────────────────────────────────────────────────────────────────

function computeVisaLoad(events: ScenarioEvent[]): number {
  let count = 0;
  for (const evt of events) {
    const country = getCountryData(evt.country);
    if ((country as { visaRequired: boolean }).visaRequired) count += evt.quantity;
    if (evt.destinationCountry) {
      const dest = getCountryData(evt.destinationCountry);
      if ((dest as { visaRequired: boolean }).visaRequired) count += evt.quantity;
    }
  }
  return count;
}

// ── Risk Heatmap ──────────────────────────────────────────────────────────────

function buildHeatmap(events: ScenarioEvent[], triggers: PolicyTrigger[]): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const pairs = new Map<string, { country: CountryCode; eventType: EventType; count: number }>();

  for (const evt of events) {
    const key = `${evt.country}::${evt.eventType}`;
    const existing = pairs.get(key);
    if (existing) existing.count += evt.quantity;
    else pairs.set(key, { country: evt.country, eventType: evt.eventType, count: evt.quantity });
  }

  for (const [, { country, eventType, count }] of pairs.entries()) {
    const cd = getCountryData(country);
    const relevantTriggers = triggers.filter(
      (t) => t.country === country && policyRules[t.policyId]?.eventTypes.includes(eventType)
    );

    const severityScores: Record<string, number> = { LOW: 20, MEDIUM: 45, HIGH: 70, CRITICAL: 95 };
    const maxSeverity = relevantTriggers.reduce((max, t) => {
      return Math.max(max, severityScores[t.severity] ?? 0);
    }, 20);

    const baseRisk = ((cd as { peSensitivity: number }).peSensitivity + (cd as { misclassSensitivity: number }).misclassSensitivity) / 2;
    const qtyBoost = Math.min(count * 3, 20);
    const riskScore = Math.min(Math.round(maxSeverity * baseRisk + qtyBoost), 100);

    const labelMap: Record<string, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
    const topSeverity = relevantTriggers[0]?.severity ?? 'LOW';
    cells.push({ country, eventType, riskScore, label: labelMap[topSeverity] ?? 'Low' });
  }

  return cells;
}

// ── Evidence ──────────────────────────────────────────────────────────────────

function collectEvidence(triggers: PolicyTrigger[]): Evidence[] {
  const evidenceIds = new Set<string>();
  triggers.forEach((t) => t.evidenceIds.forEach((id) => evidenceIds.add(id)));
  return evidenceLibrary.filter((e) => evidenceIds.has(e.id));
}

// ── Data Gaps ─────────────────────────────────────────────────────────────────

function identifyDataGaps(events: ScenarioEvent[], triggers: PolicyTrigger[]): string[] {
  const gaps: string[] = [];

  const hasRelocation = events.some((e) => e.eventType === 'relocation');
  if (hasRelocation) {
    const missingDest = events.filter((e) => e.eventType === 'relocation' && !e.destinationCountry);
    if (missingDest.length > 0) {
      gaps.push('Destination country missing for one or more relocation events — shadow payroll analysis incomplete.');
    }
  }

  const hasPE = triggers.some((t) => t.family === 'PE');
  if (hasPE) {
    gaps.push('Existing entity presence in-country not confirmed — Tax Presence Exposure model assumes no current entity. Provide entity register data for accurate assessment.');
  }

  const hasEquity = triggers.some((t) => t.family === 'Equity');
  if (hasEquity) {
    gaps.push('Equity award vesting schedule not provided — withholding estimates use salary proxy only. Provide grant details for accurate liability model.');
  }

  const hasTerm = triggers.some((t) => t.family === 'Termination');
  if (hasTerm) {
    gaps.push('Worker tenure data not included — notice period and severance calculations use minimum statutory estimates only.');
  }

  const hasConversion = events.some((e) => e.eventType === 'contractor_conversion');
  if (hasConversion) {
    gaps.push('Contractor engagement history not available — Employment Status Exposure screen uses pattern indicators only. Provide engagement contracts for deeper analysis.');
  }

  return gaps;
}

// ── Staging Suggestion ────────────────────────────────────────────────────────

function computeStagingSuggestion(
  events: ScenarioEvent[],
  breaches: ThresholdBreach[],
  pcr: PCRLevel
): string {
  const terminations = events.filter((e) => e.eventType === 'termination');
  const conversions = events.filter((e) => e.eventType === 'contractor_conversion');
  const relocations = events.filter((e) => e.eventType === 'relocation');

  const hasClusteredTerminations = breaches.some(
    (b) => b.thresholdId === 'termination_cluster' && b.breached
  );
  const hasHighPCR = pcr === 'High';
  const hasPEBreach = breaches.some((b) => b.thresholdId === 'pe_worker_count' && b.breached);

  const suggestions: string[] = [];

  if (hasClusteredTerminations && terminations.length > 0) {
    suggestions.push(
      'Stage terminations across two quarters to stay below collective consultation thresholds and reduce execution clustering pressure.'
    );
  }
  if (conversions.length > 0 && hasPEBreach) {
    suggestions.push(
      'Sequence contractor conversions after entity readiness check to avoid Tax Presence Exposure during transition window.'
    );
  }
  if (relocations.length > 0) {
    suggestions.push(
      'Begin visa and right-to-work processing at least 14 days before target relocation quarter to avoid start-date slippage.'
    );
  }
  if (hasHighPCR) {
    suggestions.push(
      'Shift event timing away from payroll cutoff window (±5 days) to reduce retroactive adjustment risk.'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'No critical staging conflicts detected. Proceed with standard compliance review workflow before Q-start.'
    );
  }

  return suggestions.join(' ');
}

// ── Summary Builder ───────────────────────────────────────────────────────────

function buildSummary(
  events: ScenarioEvent[],
  triggers: PolicyTrigger[],
  breaches: ThresholdBreach[]
): string {
  const totalWorkers = events.reduce((sum, e) => sum + e.quantity, 0);
  const scenarioCountries = [...new Set(events.map((e) => e.country))];
  const eventTypes = [...new Set(events.map((e) => e.eventType))];
  const criticalCount = triggers.filter((t) => t.severity === 'CRITICAL').length;
  const breachedCount = breaches.filter((b) => b.breached).length;

  const eventLabels: Record<string, string> = {
    contractor_conversion: 'contractor conversion',
    termination: 'termination',
    relocation: 'relocation',
    eor_onboarding: 'EOR onboarding',
  };

  const eventDesc = eventTypes.map((e) => eventLabels[e] ?? e).join(', ');

  return (
    `Scenario includes ${totalWorkers} worker events (${eventDesc}) across ${scenarioCountries.join(', ')}. ` +
    `${triggers.length} policy trigger${triggers.length !== 1 ? 's' : ''} activated` +
    (criticalCount > 0 ? `, including ${criticalCount} CRITICAL` : '') +
    `. ${breachedCount} threshold${breachedCount !== 1 ? 's' : ''} breached. ` +
    `Demo model — illustrative policies only. Not legal advice.`
  );
}

// ── Apply Recommended Sequencing (deterministic) ─────────────────────────────

export function applyRecommendedSequencing(events: ScenarioEvent[]): ScenarioEvent[] {
  const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const result: ScenarioEvent[] = [...events];

  // Split clustered terminations across two quarters
  const termsByKey = new Map<string, { total: number; indices: number[] }>();
  events.forEach((evt, idx) => {
    if (evt.eventType === 'termination') {
      const key = `${evt.country}::${evt.timingQuarter}`;
      if (!termsByKey.has(key)) termsByKey.set(key, { total: 0, indices: [] });
      const entry = termsByKey.get(key)!;
      entry.total += evt.quantity;
      entry.indices.push(idx);
    }
  });

  for (const [key, { total, indices }] of termsByKey.entries()) {
    const quarter = key.split('::')[1] as Quarter;
    const qIdx = QUARTERS.indexOf(quarter);
    if (total >= 3 && qIdx < 3 && indices.length > 0) {
      const firstIdx = indices[0];
      const firstEvt = result[firstIdx];
      const firstHalf = Math.ceil(firstEvt.quantity / 2);
      const secondHalf = firstEvt.quantity - firstHalf;
      if (secondHalf > 0) {
        result[firstIdx] = { ...firstEvt, quantity: firstHalf };
        result.push({
          ...firstEvt,
          id: `${firstEvt.id}_seq`,
          quantity: secondHalf,
          timingQuarter: QUARTERS[qIdx + 1],
        });
      }
    }
  }

  // Delay contractor conversions if large batch (PE risk mitigation)
  const totalConversions = events
    .filter((e) => e.eventType === 'contractor_conversion')
    .reduce((s, e) => s + e.quantity, 0);

  if (totalConversions >= 5) {
    result.forEach((evt, idx) => {
      if (evt.eventType === 'contractor_conversion') {
        const qIdx = QUARTERS.indexOf(evt.timingQuarter);
        if (qIdx < 3) {
          result[idx] = { ...evt, timingQuarter: QUARTERS[qIdx + 1] };
        }
      }
    });
  }

  return result;
}

// ── Main Entrypoint ───────────────────────────────────────────────────────────

export function evaluateScenario(
  events: ScenarioEvent[],
  weights: OFSWeights = DEFAULT_OFS_WEIGHTS
): ScenarioEvaluation {
  const triggers = riskEngine(events);
  const thresholdBreaches = thresholdEngine(events);
  const workflow = workflowOrchestrator(events);
  const gli = computeGLI(events, workflow, triggers);
  const pcr = computePCR(events);
  const liabilityTail = computeLiabilityTail(events);
  const heatmap = buildHeatmap(events, triggers);
  const evidence = collectEvidence(triggers);
  const totalCostImpact = computeTotalCost(events);
  const headcountDelta = computeHeadcountDelta(events);
  const riskClusterCount = triggers.filter(
    (t) => t.severity === 'HIGH' || t.severity === 'CRITICAL'
  ).length;
  const visaLoad = computeVisaLoad(events);
  const dataGaps = identifyDataGaps(events, triggers);
  const stagingSuggestion = computeStagingSuggestion(events, thresholdBreaches, pcr);

  // OFS components
  const inputCompletenessScore = computeInputCompleteness(events);
  const exposureScore = computeExposureScore(events, triggers);
  const governanceLoad = computeGovernanceLoad(workflow, triggers);
  const executionClusterRisk = computeExecutionClusterRisk(events, triggers);
  const confidencePenalty = Math.round(100 - inputCompletenessScore);

  const componentScores: OFSComponentScores = {
    exposureScore,
    governanceLoad,
    executionClusterRisk,
    inputCompletenessScore,
    confidencePenalty,
  };

  const ofs = computeOFS(componentScores, weights);

  const signals: SignalSummary = {
    totalCostImpact,
    headcountDelta,
    riskClusterCount,
    visaLoad,
    ofs,
    gli,
    pcr,
    liabilityTail,
    exposureScore,
    governanceLoad,
    executionClusterRisk,
    inputCompletenessScore,
  };

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    summary: buildSummary(events, triggers, thresholdBreaches),
    signals,
    heatmap,
    thresholdBreaches,
    triggers,
    workflow,
    evidence,
    dataGaps,
    stagingSuggestion,
    componentScores,
    weights,
  };
}
