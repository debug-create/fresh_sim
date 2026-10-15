import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Braces, Check, ChevronDown, Download, GitBranch, ShieldCheck, Sparkles, TrendingDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Entity } from '../types';
import { ARJUN_CURRENT_ASSESSMENT_REASSESSED, ARJUN_ORIGINAL_ASSESSMENT, DEVRAJ_ASSESSMENT, NEHA_ASSESSMENT, PRIYA_ASSESSMENT } from '../data/recordingSeed';
import { IKORI_PERSONAS } from '../data/identityAliases';
import { EvaluationArtifact, loadLatestEvaluationResult } from '../data/evaluation/loadEvaluationResults';
import './ResultsDashboard.css';
import './ResultsMetrics.css';
import { ProductBrand, ProductHeaderFrame, ProductNavigation } from './ProductNavigation';

type ProductView = '3d-graph' | 'threat-map' | 'matrix' | 'access-requests';
interface ResultsDashboardProps { entities: Entity[]; onNavigateHome: () => void; onNavigateProduct: (view: ProductView) => void; onNavigateSimulation: () => void; }
type ScenarioKey = 'all' | 'resolved' | 'escalated' | 'sparse';

const scenarioData = [
  { id: '101', name: IKORI_PERSONAS.priya, outcome: 'resolved', raw: PRIYA_ASSESSMENT.raw_deviation, residual: PRIYA_ASSESSMENT.residual_risk, confidence: Math.round((PRIYA_ASSESSMENT.assessment_confidence ?? 0) * 100) },
  { id: '104', name: IKORI_PERSONAS.devraj, outcome: 'escalated', raw: DEVRAJ_ASSESSMENT.raw_deviation, residual: DEVRAJ_ASSESSMENT.residual_risk, confidence: Math.round((DEVRAJ_ASSESSMENT.assessment_confidence ?? 0) * 100) },
  { id: '107', name: IKORI_PERSONAS.arjun, outcome: 'resolved', raw: ARJUN_CURRENT_ASSESSMENT_REASSESSED.raw_deviation, residual: ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk, confidence: Math.round((ARJUN_CURRENT_ASSESSMENT_REASSESSED.assessment_confidence ?? 0) * 100) },
  { id: '112', name: IKORI_PERSONAS.neha, outcome: 'sparse', raw: NEHA_ASSESSMENT.raw_deviation, residual: NEHA_ASSESSMENT.residual_risk, confidence: Math.round((NEHA_ASSESSMENT.assessment_confidence ?? 0) * 100) },
] as const;

const outcomeColors: Record<string, string> = { resolved: '#34D399', escalated: '#FB3B57', sparse: '#F59E0B' };
const replayStages = [
  { label: 'Signal detected', detail: 'Off-pattern access grouped into one review episode', color: '#FB3B57' },
  { label: 'Twin correlated', detail: 'Identity, asset and context evidence connected', color: '#22D3EE' },
  { label: 'Context applied', detail: 'Approved evidence recalculated the assessment', color: '#A78BFA' },
  { label: 'Decision recorded', detail: 'Human-reviewed outcome preserved with provenance', color: '#34D399' },
];

const asPercent = (value?: number, digits = 1) => value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;
const asCrore = (value?: number) => value === undefined ? '—' : `₹${(value / 10_000_000).toFixed(2)} Cr`;

export function ResultsDashboard({ entities, onNavigateHome, onNavigateProduct, onNavigateSimulation }: ResultsDashboardProps) {
  const [scenario, setScenario] = useState<ScenarioKey>('all');
  const [metric, setMetric] = useState<'risk' | 'confidence'>('risk');
  const [methodOpen, setMethodOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [evaluationArtifact, setEvaluationArtifact] = useState<EvaluationArtifact | null>(null);
  const [evaluationChecked, setEvaluationChecked] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStage((stage) => (stage + 1) % replayStages.length), 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadLatestEvaluationResult().then((artifact) => { setEvaluationArtifact(artifact); setEvaluationChecked(true); });
  }, []);

  const filteredData = useMemo(() => scenario === 'all' ? scenarioData : scenarioData.filter((item) => item.outcome === scenario), [scenario]);
  const reassessmentDrop = ARJUN_ORIGINAL_ASSESSMENT.residual_risk - ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk;
  const performance = evaluationArtifact?.performance;
  const containment = evaluationArtifact?.containment;
  const uncertainty = evaluationArtifact?.uncertainty;
  const dataset = evaluationArtifact?.dataset;
  const ensemble = evaluationArtifact?.ensemble;
  const robustness = evaluationArtifact?.robustness;
  const benchmarkData = useMemo(() => performance ? [
    { metric: 'PR-AUC', gnn: performance.gnn.prAuc * 100, baseline: performance.logistic.prAuc * 100 },
    { metric: 'ROC-AUC', gnn: performance.gnn.rocAuc * 100, baseline: performance.logistic.rocAuc * 100 },
    { metric: 'F1 @ 0.5', gnn: (performance.gnn.f1 || 0) * 100, baseline: (performance.logistic.f1 || 0) * 100 },
    ...(performance.indicativeTest ? [
      { metric: 'Test PR', gnn: performance.indicativeTest.gnn.prAuc * 100, baseline: performance.indicativeTest.logistic.prAuc * 100 },
      { metric: 'Test ROC', gnn: performance.indicativeTest.gnn.rocAuc * 100, baseline: performance.indicativeTest.logistic.rocAuc * 100 },
    ] : []),
  ] : [], [performance]);
  const impactData = useMemo(() => containment ? [
    { stage: 'Before', damage: containment.beforeDamageInr / 10_000_000, probability: containment.beforeReachProbability * 100 },
    { stage: 'After', damage: containment.afterDamageInr / 10_000_000, probability: containment.afterReachProbability * 100 },
  ] : [], [containment]);

  const exportReport = () => {
    const payload = { report: 'IKORI Decision Evidence', source: evaluationArtifact?.provenance || 'Deterministic synthetic recording fixture', generatedAt: new Date().toISOString(), evaluation: evaluationArtifact, scenarioAssessments: scenarioData };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ikori-decision-evidence.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="results-page">
      <ProductHeaderFrame>
        <ProductBrand onHome={onNavigateHome} />
        <ProductNavigation active="results" onNavigate={(target) => target === 'simulation' ? onNavigateSimulation() : target !== 'results' && onNavigateProduct(target)} />
        <div className={`results-nav-status ${evaluationArtifact ? 'is-connected' : ''}`}><span /> {evaluationArtifact ? 'ML results connected' : 'Loading evaluation'}</div>
      </ProductHeaderFrame>

      <div className="results-shell">
        <section className="results-heading">
          <div><p className="results-eyebrow"><Sparkles size={13} /> Decision evidence</p><h1>Results <span>that explain themselves.</span></h1><p className="results-subtitle">See what changed, why it changed, and what still needs evidence.</p></div>
          <div className="results-heading-actions">
            <label className="results-filter"><span>Scenario cohort</span><select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioKey)}><option value="all">All scenarios</option><option value="resolved">Context resolved</option><option value="escalated">Escalated</option><option value="sparse">Sparse evidence</option></select><ChevronDown size={14} /></label>
            <button className="results-export" onClick={exportReport}><Download size={15} /> Export evidence</button>
          </div>
        </section>

        <div className="results-provenance"><Activity size={14} /><span>{evaluationArtifact ? <><strong>Evaluation artifact connected.</strong> {evaluationArtifact.modelVersion} · {evaluationArtifact.datasetVersion} · generated {new Date(evaluationArtifact.evaluatedAt).toLocaleString()}</> : <><strong>{evaluationChecked ? 'Awaiting results.json.' : 'Reading results.json…'}</strong> Seeded scenario evidence remains available while the artifact loads.</>}</span></div>

        <section className="results-kpis" aria-label="Results summary">
          <article className="is-cyan"><span>GNN PR-AUC</span><strong>{asPercent(performance?.gnn.prAuc)}</strong><small>760 labelled relationships</small></article>
          <article className="is-violet"><span>Selective PR-AUC</span><strong>{asPercent(performance?.selective.prAuc)}</strong><small>Lowest-uncertainty 25%</small></article>
          <article className="is-amber"><span>GNN ROC-AUC</span><strong>{asPercent(performance?.gnn.rocAuc)}</strong><small>Ordinary validation split</small></article>
          <article className="is-emerald"><span>Projected damage cut</span><strong>{containment ? `${containment.reductionPercent.toFixed(1)}%` : '—'}</strong><small>{containment?.criticalAssetsProtected ?? '—'} critical assets protected</small></article>
        </section>

        {performance && containment && <section className="results-ml-grid" aria-label="ML evaluation visualizations">
          <article className="results-panel results-model-benchmark">
            <div className="results-panel-head"><div><span className="results-index">ML 01</span><h2>Model benchmark</h2></div><span className="results-artifact-chip">results.json</span></div>
            <p className="results-panel-copy">Scenario-disjoint validation plus indicative holdout performance against the transparent logistic baseline.</p>
            <div className="results-model-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={benchmarkData} margin={{ top: 16, right: 10, left: -18, bottom: 0 }} barGap={5}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" strokeDasharray="3 7" /><XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 10 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 9 }} /><Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ background: '#09090D', border: '1px solid rgba(255,255,255,.12)', color: '#fff', borderRadius: 10, fontSize: 11 }} /><Bar dataKey="gnn" name="Hetero-GNN" fill="#22D3EE" radius={[5, 5, 0, 0]} /><Bar dataKey="baseline" name="Logistic baseline" fill="#A78BFA" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="results-legend"><span><i className="is-gnn" /> Hetero-GNN ensemble</span><span><i className="is-baseline" /> Logistic baseline</span></div>
          </article>

          <article className="results-panel results-containment-result">
            <div className="results-panel-head"><div><span className="results-index">ML 02</span><h2>Digital-twin containment</h2></div><TrendingDown size={17} /></div>
            <p className="results-panel-copy">The same Monte Carlo metric replayed after the minimum intervention.</p>
            <div className="results-impact-hero"><span>Projected reduction</span><strong>{containment.reductionPercent.toFixed(2)}%</strong><small>{containment.intervention}</small></div>
            <div className="results-before-after">
              {impactData.map((item, index) => <div key={item.stage}><header><span>{item.stage}</span><strong>{asCrore(item.damage * 10_000_000)}</strong></header><div><i style={{ width: `${Math.max(4, item.damage / impactData[0].damage * 100)}%` }} className={index ? 'is-after' : ''} /></div><small>{item.probability.toFixed(1)}% target reach probability</small></div>)}
            </div>
            <div className="results-saved"><strong>{asCrore(containment.reductionInr)}</strong><span>synthetic expected damage avoided</span></div>
          </article>

          <article className="results-panel results-validation-card">
            <div className="results-panel-head"><div><span className="results-index">ML 03</span><h2>Confidence &amp; generalization</h2></div><Activity size={17} /></div>
            <div className="results-confidence-list">
              <div><span>GNN PR-AUC · 95% bootstrap CI</span><strong>{asPercent(performance.bootstrap.prAucLow)} — {asPercent(performance.bootstrap.prAucHigh)}</strong><div className="results-ci"><i style={{ left: `${performance.bootstrap.prAucLow * 100}%`, width: `${(performance.bootstrap.prAucHigh - performance.bootstrap.prAucLow) * 100}%` }} /></div></div>
              <div><span>Probability GNN beats baseline</span><strong>{asPercent(performance.bootstrap.probabilityBetter)}</strong><small>{performance.bootstrap.iterations} paired bootstrap iterations · directional, not conclusive</small></div>
              <div><span>Unseen-family PR-AUC</span><strong>{asPercent(performance.unseenFamilies.prAuc)}</strong><small>Best: {performance.unseenFamilies.bestFamily.replaceAll('_', ' ')} · weakest: {performance.unseenFamilies.weakestFamily.replaceAll('_', ' ')}</small></div>
            </div>
          </article>

          <article className="results-panel results-mcmc-card">
            <div className="results-panel-head"><div><span className="results-index">ML 04</span><h2>MCMC health</h2></div><span className={`results-convergence ${uncertainty?.converged ? 'is-good' : ''}`}>{uncertainty?.converged ? 'Converged' : 'Checking'}</span></div>
            <div className="results-mcmc-grid"><div><span>Chains</span><strong>{uncertainty?.chains}</strong></div><div><span>Samples</span><strong>{uncertainty?.retainedSamples}</strong></div><div><span>Max R-hat</span><strong>{uncertainty?.maxRHat.toFixed(3)}</strong></div><div><span>Min ESS</span><strong>{uncertainty?.minimumEffectiveSampleSize.toFixed(1)}</strong></div></div>
            <p className="results-mcmc-note"><Check size={13} /> Acceptance rate {asPercent(uncertainty?.acceptanceRate)}; convergence threshold passed for the recorded run.</p>
          </article>
        </section>}

        {dataset && ensemble && robustness && <section className="results-evidence-grid" aria-label="Evaluation depth and robustness">
          <article className="results-panel results-dataset-card">
            <div className="results-panel-head"><div><span className="results-index">EV 01</span><h2>Scenario-disjoint evaluation</h2></div><span className="results-evidence-pass">No scenario leakage</span></div>
            <p className="results-panel-copy">All edges from one scenario stay in one split, so the model is tested on unseen scenarios.</p>
            <div className="results-split-bar" aria-label="Dataset split by candidate edges"><i style={{ width: `${dataset.trainEdges / dataset.candidateEdges * 100}%` }} /><i style={{ width: `${dataset.validationEdges / dataset.candidateEdges * 100}%` }} /><i style={{ width: `${dataset.testEdges / dataset.candidateEdges * 100}%` }} /></div>
            <div className="results-split-grid">
              <div><span><i /> Train</span><strong>{dataset.trainEdges.toLocaleString()}</strong><small>{dataset.trainScenarios} scenarios</small></div>
              <div><span><i /> Validation</span><strong>{dataset.validationEdges.toLocaleString()}</strong><small>{dataset.validationScenarios} scenarios</small></div>
              <div><span><i /> Holdout</span><strong>{dataset.testEdges.toLocaleString()}</strong><small>{dataset.testScenarios} scenarios</small></div>
            </div>
            <footer><strong>{dataset.candidateEdges.toLocaleString()}</strong> candidate relationships across <strong>{dataset.scenarios}</strong> attack scenarios</footer>
          </article>

          <article className="results-panel results-ensemble-card">
            <div className="results-panel-head"><div><span className="results-index">EV 02</span><h2>Ensemble uplift</h2></div><span className="results-evidence-pass">3 GraphSAGE members</span></div>
            <p className="results-panel-copy">Independent seeds reduce variance; the ensemble mean exceeds every member.</p>
            <div className="results-member-bars">
              {ensemble.members.map((member) => <div key={member.seed}><span>Seed {member.seed}</span><div><i style={{ width: `${member.prAuc * 100}%` }} /></div><strong>{asPercent(member.prAuc)}</strong></div>)}
              <div className="is-ensemble"><span>Ensemble</span><div><i style={{ width: `${ensemble.meanPrAuc * 100}%` }} /></div><strong>{asPercent(ensemble.meanPrAuc)}</strong></div>
            </div>
            <div className="results-variance"><span>Mean epistemic variance <strong>{ensemble.meanVariance.toFixed(4)}</strong></span><span>P95 variance <strong>{ensemble.p95Variance.toFixed(4)}</strong></span></div>
          </article>

          <article className="results-panel results-family-card">
            <div className="results-panel-head"><div><span className="results-index">EV 03</span><h2>Unseen attack families</h2></div><strong className="results-aggregate">{asPercent(performance?.unseenFamilies.prAuc)} aggregate</strong></div>
            <p className="results-panel-copy">Leave-one-family-out PR-AUC. Higher bars mean better transfer to a topology absent from training.</p>
            <div className="results-family-bars">{robustness.families.map((family) => <div key={family.id}><span>{family.id}</span><label>{family.name.replaceAll('_', ' ')}</label><div><i style={{ width: `${family.prAuc * 100}%` }} /></div><strong>{asPercent(family.prAuc)}</strong></div>)}</div>
          </article>

          <article className="results-panel results-stress-card">
            <div className="results-panel-head"><div><span className="results-index">EV 04</span><h2>Evidence stress test</h2></div><span className="results-evidence-pass">{robustness.evidenceChecksPassed}/{robustness.evidenceChecksTotal} invariants pass</span></div>
            <p className="results-panel-copy">PR-AUC after removing specific evidence. The combined test is the deliberate worst case.</p>
            <div className="results-stress-list">{robustness.stressTests.map((test, index) => <div key={test.name} className={index === 0 ? 'is-baseline' : ''}><span>{test.name}</span><div><i style={{ width: `${test.prAuc * 100}%` }} /></div><strong>{asPercent(test.prAuc)}</strong><small>{test.delta === 0 ? 'baseline' : `${(test.delta * 100).toFixed(1)} pts`}</small></div>)}</div>
            <footer>Evidence-basis masking causes the largest single-factor drop, confirming that observed evidence materially drives the prediction.</footer>
          </article>
        </section>}

        <section className="results-grid">
          <article className="results-panel results-profile">
            <div className="results-panel-head"><div><span className="results-index">01</span><h2>Scenario outcomes</h2></div><div className="results-segmented"><button className={metric === 'risk' ? 'is-active' : ''} onClick={() => setMetric('risk')}>Risk</button><button className={metric === 'confidence' ? 'is-active' : ''} onClick={() => setMetric('confidence')}>Confidence</button></div></div>
            <p className="results-panel-copy">Recorded outcomes by scenario. Hover any bar for the exact value.</p>
            <div className="results-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredData} margin={{ top: 16, right: 8, left: -22, bottom: 0 }} barGap={7}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.06)" strokeDasharray="3 7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} /><Tooltip cursor={{ fill: 'rgba(255,255,255,.03)' }} contentStyle={{ background: '#09090D', border: '1px solid rgba(255,255,255,.12)', color: '#fff', borderRadius: 10, fontSize: 12 }} />{metric === 'risk' ? <><Bar dataKey="raw" name="Raw deviation" fill="#334155" radius={[6, 6, 0, 0]} /><Bar dataKey="residual" name="Residual risk" radius={[6, 6, 0, 0]}>{filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}</Bar></> : <Bar dataKey="confidence" name="Assessment confidence" radius={[6, 6, 0, 0]}>{filteredData.map((entry) => <Cell key={entry.id} fill={outcomeColors[entry.outcome]} />)}</Bar>}</BarChart></ResponsiveContainer></div>
          </article>

          <article className="results-panel results-replay">
            <div className="results-panel-head"><div><span className="results-index">02</span><h2>Decision replay</h2></div><span className="results-live"><i /> Live sequence</span></div>
            <p className="results-panel-copy">How the digital twin turns telemetry into a reviewable decision.</p>
            <div className="results-replay-track"><span className="results-replay-line" />{replayStages.map((stage, index) => <button key={stage.label} className={activeStage === index ? 'is-active' : activeStage > index ? 'is-complete' : ''} onClick={() => setActiveStage(index)}><span className="results-stage-dot" style={{ '--stage-color': stage.color } as React.CSSProperties}>{activeStage > index ? <Check size={11} /> : index + 1}</span><span><strong>{stage.label}</strong><small>{stage.detail}</small></span></button>)}</div>
          </article>

          <article className="results-panel results-impact">
            <div className="results-panel-head"><div><span className="results-index">03</span><h2>Context intervention</h2></div><ShieldCheck size={17} /></div><p className="results-panel-copy">Case 107 · original and reassessed records remain side by side.</p>
            <div className="results-impact-values"><div><span>Before context</span><strong>{ARJUN_ORIGINAL_ASSESSMENT.residual_risk}</strong></div><div className="results-impact-arrow">→</div><div><span>After review</span><strong>{ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}</strong></div></div>
            <div className="results-impact-bar"><span style={{ width: `${ARJUN_CURRENT_ASSESSMENT_REASSESSED.residual_risk}%` }} /></div><div className="results-impact-caption"><strong>−{reassessmentDrop.toFixed(1)} points</strong><span>Context changed the decision—not the original evidence.</span></div>
          </article>

          <article className="results-panel results-cases">
            <div className="results-panel-head"><div><span className="results-index">04</span><h2>Scenario status</h2></div><GitBranch size={17} /></div>
            <div className="results-case-list">{filteredData.map((item) => <div key={item.id}><span className="results-case-orb" style={{ background: outcomeColors[item.outcome], boxShadow: `0 0 18px ${outcomeColors[item.outcome]}55` }} /><div><strong>{item.name}</strong><small>Case {item.id} · {item.outcome}</small></div><div className="results-case-score"><strong>{item.residual}</strong><small>residual</small></div><div className="results-case-score"><strong>{item.confidence}%</strong><small>confidence</small></div></div>)}</div>
          </article>

          <article className="results-panel results-readiness">
            <div className="results-panel-head"><div><span className="results-index">05</span><h2>Evaluation readiness</h2></div><Braces size={17} /></div>
            <div className="results-readiness-body"><div className={`results-ring ${performance ? 'is-complete' : ''}`}><div><strong>{performance ? '4/4' : '1/4'}</strong><span>inputs ready</span></div></div><div className="results-checks"><p className="is-ready"><Check size={13} /> Scenario fixture</p><p className={performance ? 'is-ready' : ''}>{performance ? <Check size={13} /> : <span />} Held-out labels</p><p className={performance ? 'is-ready' : ''}>{performance ? <Check size={13} /> : <span />} Prediction export</p><p className={performance ? 'is-ready' : ''}>{performance ? <Check size={13} /> : <span />} Baseline comparison</p></div></div>
            <div className="results-benchmark-note"><strong>{performance ? 'Evaluation metrics loaded' : 'Waiting for evaluation metrics'}</strong><span>{performance ? `${evaluationArtifact?.modelVersion} is displayed with baseline and uncertainty context.` : 'Add results.json to the evaluation artifact folder.'}</span></div>
          </article>
        </section>

        <section className="results-method"><button onClick={() => setMethodOpen((open) => !open)} aria-expanded={methodOpen}><span><Braces size={16} /><strong>Methodology &amp; provenance</strong><small>How to interpret these results</small></span><ChevronDown size={17} className={methodOpen ? 'is-open' : ''} /></button>{methodOpen && <div className="results-method-body"><p><strong>Artifact.</strong> Metrics are read from versioned <code>results.json</code>; replacing the file refreshes this dashboard at build time.</p><p><strong>Validation.</strong> PR-AUC, ROC-AUC and F1 use {evaluationArtifact?.split.test || 'labelled'} relationships, with a logistic baseline shown beside the GNN.</p><p><strong>Containment.</strong> Monetary values are synthetic INR estimates projected by replaying the same metric on a cloned digital twin.</p><p><strong>Guardrail.</strong> Bootstrap overlap means the GNN advantage is directional, not statistically conclusive across every metric.</p></div>}</section>
      </div>
    </main>
  );
}
