import type { OFSComponentScores, OFSWeights, ScenarioEvaluation, ThresholdBreach } from '@/engine/types';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function computeWFS(components: OFSComponentScores, weights: OFSWeights): number {
  const raw =
    components.exposureScore * weights.exposure +
    components.governanceLoad * weights.governance +
    components.executionClusterRisk * weights.speed +
    components.confidencePenalty * weights.confidence;
  return Math.min(Math.round(raw), 100);
}

export function formatWFS(value: number): string {
  return `${Math.round(value)}`;
}

export interface SequencingProjection {
  components: OFSComponentScores;
  exposure: number;
  breaches: number;
  breachReduction: number;
  wfs: number;
}

export function deriveSequencingProjection(
  evaluation: ScenarioEvaluation,
  weights: OFSWeights,
): SequencingProjection {
  const currentBreaches = evaluation.thresholdBreaches.filter((b) => b.breached).length;
  const breaches = Math.max(0, currentBreaches - 2);
  const breachReduction = currentBreaches - breaches;

  const exposure = clampScore(Math.round(evaluation.signals.exposureScore * 0.72));
  const governanceLoad = clampScore(Math.round(evaluation.componentScores.governanceLoad * (1 - (0.06 * breachReduction))));
  const executionClusterRisk = clampScore(Math.round(evaluation.componentScores.executionClusterRisk * (1 - (0.08 * breachReduction))));

  const components: OFSComponentScores = {
    ...evaluation.componentScores,
    exposureScore: exposure,
    governanceLoad,
    executionClusterRisk,
  };

  const wfs = computeWFS(components, weights);

  return {
    components,
    exposure,
    breaches,
    breachReduction,
    wfs,
  };
}

function reduceThresholdBreaches(
  thresholdBreaches: ThresholdBreach[],
  breachReduction: number,
): ThresholdBreach[] {
  if (breachReduction <= 0) return thresholdBreaches;

  let remaining = breachReduction;

  return thresholdBreaches.map((breach) => {
    if (!breach.breached || remaining <= 0) return breach;
    remaining -= 1;
    return {
      ...breach,
      breached: false,
      current: Math.max(0, breach.threshold - 1),
    };
  });
}

export function applySequencingToEvaluation(
  evaluation: ScenarioEvaluation,
  weights: OFSWeights,
): ScenarioEvaluation {
  const projection = deriveSequencingProjection(evaluation, weights);

  return {
    ...evaluation,
    signals: {
      ...evaluation.signals,
      exposureScore: projection.exposure,
      governanceLoad: projection.components.governanceLoad,
      executionClusterRisk: projection.components.executionClusterRisk,
      riskClusterCount: Math.max(0, evaluation.signals.riskClusterCount - projection.breachReduction),
      ofs: projection.wfs,
    },
    componentScores: projection.components,
    thresholdBreaches: reduceThresholdBreaches(evaluation.thresholdBreaches, projection.breachReduction),
  };
}
