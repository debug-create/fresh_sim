export interface ModelScoreSet {
  prAuc: number;
  rocAuc: number;
  f1?: number;
  brier?: number;
  logLoss?: number;
}

export interface EvaluationArtifact {
  id: string;
  title: string;
  status: string;
  modelVersion: string;
  datasetVersion: string;
  evaluatedAt: string;
  provenance: string;
  split: { train?: number; validation?: number; test: number };
  dataset?: {
    scenarios: number;
    candidateEdges: number;
    trainScenarios: number;
    validationScenarios: number;
    testScenarios: number;
    trainEdges: number;
    validationEdges: number;
    testEdges: number;
  };
  performance?: {
    gnn: ModelScoreSet;
    logistic: ModelScoreSet;
    selective: ModelScoreSet & { coverage: number };
    unseenFamilies: ModelScoreSet & { bestFamily: string; weakestFamily: string };
    indicativeTest?: { gnn: ModelScoreSet; logistic: ModelScoreSet };
    bootstrap: {
      iterations: number;
      prAucLow: number;
      prAucHigh: number;
      probabilityBetter: number;
      conclusive: boolean;
    };
  };
  containment?: {
    beforeDamageInr: number;
    afterDamageInr: number;
    reductionInr: number;
    reductionPercent: number;
    beforeReachProbability: number;
    afterReachProbability: number;
    criticalAssetsProtected: number;
    intervention: string;
  };
  uncertainty?: {
    chains: number;
    retainedSamples: number;
    acceptanceRate: number;
    maxRHat: number;
    minimumEffectiveSampleSize: number;
    converged: boolean;
  };
  ensemble?: {
    members: Array<{ seed: string; prAuc: number; logLoss: number }>;
    meanPrAuc: number;
    meanLogLoss: number;
    meanVariance: number;
    p95Variance: number;
  };
  robustness?: {
    families: Array<{ id: string; name: string; prAuc: number; rocAuc: number; f1: number }>;
    stressTests: Array<{ name: string; prAuc: number; delta: number }>;
    evidenceChecksPassed: number;
    evidenceChecksTotal: number;
  };
  claimGuardrails?: string[];
}

const artifactModules = import.meta.glob('./artifacts/*.json', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

type JsonRecord = Record<string, any>;
const isRecord = (value: unknown): value is JsonRecord => Boolean(value && typeof value === 'object');

export function normalizeEvaluationArtifact(value: unknown): EvaluationArtifact | null {
  if (!isRecord(value)) return null;

  if (value.id && value.modelVersion && value.datasetVersion && value.evaluatedAt && value.split?.test) {
    return value as EvaluationArtifact;
  }

  const validation = value.ml_validation;
  const demo = value.judge_demo;
  if (!value.schema_version || !validation?.model || !validation?.ordinary_validation || !demo) return null;

  const ordinary = validation.ordinary_validation;
  const logistic = validation.logistic_comparison;
  const selective = validation.selective_prediction;
  const unseen = validation.unseen_family_validation;
  const bootstrap = validation.paired_bootstrap;
  const reduction = demo.measured_reduction;
  const dataset = value.dataset_contract;
  const ensemble = value.ensemble_analysis;
  const robustness = value.robustness_scorecard;

  return {
    id: demo.scenario_id || 'attack-twin-evaluation',
    title: value.title || 'AttackTwin model evaluation',
    status: value.status || 'ready',
    modelVersion: validation.model.name,
    datasetVersion: `${ordinary.relationships} labelled relationships`,
    evaluatedAt: value.generated_at,
    provenance: 'Seeded from ML results.json · reproducible local evaluation',
    split: dataset ? { train: dataset.train.edges, validation: dataset.validation.edges, test: dataset.test.edges } : { test: ordinary.relationships },
    dataset: dataset ? {
      scenarios: dataset.scenarios,
      candidateEdges: dataset.candidate_edges,
      trainScenarios: dataset.train.scenarios,
      validationScenarios: dataset.validation.scenarios,
      testScenarios: dataset.test.scenarios,
      trainEdges: dataset.train.edges,
      validationEdges: dataset.validation.edges,
      testEdges: dataset.test.edges,
    } : undefined,
    performance: {
      gnn: { prAuc: ordinary.pr_auc, rocAuc: ordinary.roc_auc, f1: ordinary.f1_at_0_5, brier: ordinary.brier, logLoss: ordinary.log_loss },
      logistic: { prAuc: logistic.pr_auc, rocAuc: logistic.roc_auc, f1: logistic.f1_at_0_5, brier: logistic.brier, logLoss: logistic.log_loss },
      selective: { prAuc: selective.pr_auc, rocAuc: selective.roc_auc, brier: selective.brier, coverage: selective.coverage },
      unseenFamilies: { prAuc: unseen.aggregate_pr_auc, rocAuc: unseen.aggregate_roc_auc, bestFamily: unseen.best_family.name, weakestFamily: unseen.weakest_family.name },
      indicativeTest: validation.indicative_test ? {
        gnn: { prAuc: validation.indicative_test.gnn.pr_auc, rocAuc: validation.indicative_test.gnn.roc_auc },
        logistic: { prAuc: validation.indicative_test.logistic.pr_auc, rocAuc: validation.indicative_test.logistic.roc_auc },
      } : undefined,
      bootstrap: { iterations: bootstrap.iterations, prAucLow: bootstrap.gnn_pr_auc_95_ci[0], prAucHigh: bootstrap.gnn_pr_auc_95_ci[1], probabilityBetter: bootstrap.probability_gnn_better, conclusive: bootstrap.statistically_conclusive },
    },
    containment: {
      beforeDamageInr: demo.before_containment.expected_damage_inr,
      afterDamageInr: demo.after_containment.expected_damage_inr,
      reductionInr: reduction.expected_damage_reduction_inr,
      reductionPercent: reduction.expected_damage_reduction_percent,
      beforeReachProbability: demo.before_containment.target_reach_probability,
      afterReachProbability: demo.after_containment.target_reach_probability,
      criticalAssetsProtected: reduction.critical_assets_protected,
      intervention: demo.selected_containment.name,
    },
    uncertainty: {
      chains: demo.mcmc.chains,
      retainedSamples: demo.mcmc.retained_samples,
      acceptanceRate: demo.mcmc.mean_acceptance_rate,
      maxRHat: demo.mcmc.max_r_hat,
      minimumEffectiveSampleSize: demo.mcmc.minimum_effective_sample_size,
      converged: demo.mcmc.converged,
    },
    ensemble: ensemble ? {
      members: ensemble.members.map((member: JsonRecord) => ({ seed: String(member.seed), prAuc: member.pr_auc, logLoss: member.log_loss })),
      meanPrAuc: ensemble.mean.pr_auc,
      meanLogLoss: ensemble.mean.log_loss,
      meanVariance: ensemble.uncertainty.mean_variance,
      p95Variance: ensemble.uncertainty.p95_variance,
    } : undefined,
    robustness: robustness ? {
      families: robustness.families.map((family: JsonRecord) => ({ id: family.id, name: family.name, prAuc: family.pr_auc, rocAuc: family.roc_auc, f1: family.f1 })),
      stressTests: robustness.stress_tests.map((test: JsonRecord) => ({ name: test.name, prAuc: test.pr_auc, delta: test.delta_pr_auc })),
      evidenceChecksPassed: robustness.evidence_invariants.passed,
      evidenceChecksTotal: robustness.evidence_invariants.total,
    } : undefined,
    claimGuardrails: value.claim_guardrails || [],
  };
}

export async function loadLatestEvaluationResult(): Promise<EvaluationArtifact | null> {
  const entries = Object.entries(artifactModules);
  if (!entries.length) return null;
  const artifacts = (await Promise.all(entries.map(async ([, load]) => normalizeEvaluationArtifact(JSON.parse(await load()))))).filter((artifact): artifact is EvaluationArtifact => Boolean(artifact));
  return artifacts.sort((a, b) => Date.parse(b.evaluatedAt) - Date.parse(a.evaluatedAt))[0] || null;
}
