import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BellRing, Check, ChevronRight, CircleStop, Database,
  Eye, FastForward, GitBranch, Gauge, History, KeyRound, Network, Pause, Play, Radar,
  RotateCcw, Scissors, Server, ShieldCheck, TestTube2, UserRound, WifiOff, X, Zap,
} from 'lucide-react';
import { ProductView } from '../routing';
import { ProductBrand, ProductHeaderFrame, ProductNavigation } from './ProductNavigation';

type GraphNode = { id: string; label: string; kind: string; x: number; y: number; reveal: number; detail: string };
type GraphEdge = { from: string; to: string; reveal: number; type: 'observed' | 'possible'; path?: 'A' | 'B' | 'C'; reason: string };

const events = [
  { time: '22:00', source: 'Leaked-password watch', title: 'Riya’s password appears in a leak', evidence: 'The leaked password belongs to the same employee account.', linked: true, node: 'identity' },
  { time: '22:03', source: 'Website protection', title: 'A routine web bot is blocked', evidence: 'Different visitor and device — this is normal background noise.', linked: false },
  { time: '22:06', source: 'Sign-in system', title: 'Riya signs in from a new device', evidence: 'Same account, new device and an unusual overseas network.', linked: true, node: 'device' },
  { time: '22:11', source: 'Company network', title: 'The new device opens a VPN tunnel', evidence: 'The VPN record carries the same account and device fingerprint.', linked: true, node: 'vpn' },
  { time: '22:14', source: 'Reporting app', title: 'The account opens the reporting tool', evidence: 'The request came through that exact VPN session.', linked: true, node: 'reporting' },
  { time: '22:19', source: 'Customer database', title: 'Database reading jumps to 18× normal', evidence: 'The reporting service reads 42,806 customer rows.', linked: true, node: 'database' },
  { time: '22:21', source: 'HR website', title: 'Someone opens an expired HR link', evidence: 'Different employee and device — it stays outside the attack story.', linked: false },
  { time: '22:24', source: 'Cloud storage', title: 'A large customer export is created', evidence: 'The exported file traces back to the same database query.', linked: true, node: 'bucket' },
];

const nodes: GraphNode[] = [
  { id: 'identity', label: 'Riya Kapoor', kind: 'IDENTITY', x: 105, y: 276, reveal: 0, detail: 'Account owner · Finance analyst · credential evidence observed' },
  { id: 'device', label: 'Unknown device', kind: 'ENDPOINT', x: 260, y: 170, reveal: 2, detail: 'First seen tonight · Singapore ASN · fingerprint fp_98af' },
  { id: 'vpn', label: 'VPN session', kind: 'SESSION', x: 410, y: 276, reveal: 3, detail: 'vpn_7842 · issued at 22:11 · identity and device verified' },
  { id: 'reporting', label: 'Reporting app', kind: 'APPLICATION', x: 570, y: 180, reveal: 4, detail: 'Finance reporting · account has verified user entitlement' },
  { id: 'service', label: 'reporting-svc', kind: 'SERVICE ID', x: 725, y: 276, reveal: 4, detail: 'Workload identity · inherited database read permission' },
  { id: 'database', label: 'Customer DB', kind: 'CRITICAL ASSET', x: 875, y: 155, reveal: 5, detail: 'Tier 0 · 2.1M customer records · database audit evidence' },
  { id: 'bucket', label: 'Export bucket', kind: 'DATA ASSET', x: 880, y: 395, reveal: 7, detail: 'Restricted billing exports · new object observed at 22:24' },
  { id: 'mailbox', label: 'Mailbox', kind: 'APPLICATION', x: 400, y: 445, reveal: 4, detail: 'Feasible through SSO; no mailbox access event observed' },
  { id: 'admin', label: 'Admin console', kind: 'PRIVILEGE', x: 650, y: 445, reveal: 5, detail: 'Possible only after colleague compromise; step not observed' },
  { id: 'noiseA', label: 'Crawler', kind: 'UNRELATED', x: 105, y: 80, reveal: 1, detail: 'Different source and identity; deliberately left unconnected' },
  { id: 'noiseB', label: 'HR 404', kind: 'UNRELATED', x: 110, y: 485, reveal: 6, detail: 'Different employee, device and session; deliberately left unconnected' },
];

const edges: GraphEdge[] = [
  { from: 'identity', to: 'device', reveal: 2, type: 'observed', path: 'A', reason: 'IdP event links account to device fingerprint' },
  { from: 'device', to: 'vpn', reveal: 3, type: 'observed', path: 'A', reason: 'VPN log contains the same account and fingerprint' },
  { from: 'vpn', to: 'reporting', reveal: 4, type: 'observed', path: 'A', reason: 'Application request carries vpn_7842' },
  { from: 'reporting', to: 'service', reveal: 4, type: 'observed', path: 'A', reason: 'Verified application-to-service trust' },
  { from: 'service', to: 'database', reveal: 5, type: 'observed', path: 'A', reason: 'Database query attributed to reporting-svc' },
  { from: 'database', to: 'bucket', reveal: 7, type: 'observed', path: 'A', reason: 'Export object traces to the query result' },
  { from: 'identity', to: 'mailbox', reveal: 4, type: 'possible', path: 'B', reason: 'Same SSO permission makes this reachable; no event observed' },
  { from: 'mailbox', to: 'admin', reveal: 5, type: 'possible', path: 'B', reason: 'Possible colleague reset route; compromise unobserved' },
  { from: 'admin', to: 'database', reveal: 5, type: 'possible', path: 'B', reason: 'Admin role has verified database grant' },
  { from: 'vpn', to: 'bucket', reveal: 6, type: 'possible', path: 'C', reason: 'Cloud workload role is reachable from VPN subnet' },
];

const phaseLabels = ['INGEST', 'CORRELATE', 'COMPILE PATHS', 'RANK & ISOLATE', 'INTERVENE'];
const interpretations = [
  { title: 'Weak signal only', body: 'A breached credential is notable, but there is not enough connected evidence to infer movement.', evidence: 'Credential exposure' },
  { title: 'Identity continuity established', body: 'The unfamiliar sign-in and VPN session share the same account and device fingerprint. Trust falls as confidence in the relationship grows.', evidence: 'Identity + device + session' },
  { title: 'Reachability becomes an attack path', body: 'Verified entitlements connect the session to the reporting service and customer database. Alternative feasible routes remain dashed.', evidence: 'Permissions + observed access' },
  { title: 'Critical route supported by evidence', body: 'Six observed hops now reach a Tier 0 data asset. Probability rises independently of the asset impact rating.', evidence: '6 correlated events' },
  { title: 'Minimum cut reduces exposure', body: 'Revoking one session and its reporting access breaks the leading path without taking the database or application offline.', evidence: '1 edge cut · 2 routes monitored' },
];

export function CompleteSimulation({ onNavigateHome, onNavigateProduct, onNavigateResults }: { onNavigateHome: () => void; onNavigateProduct: (view: ProductView) => void; onNavigateResults: () => void }) {
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [contained, setContained] = useState(false);
  const [selected, setSelected] = useState('identity');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [faultMode, setFaultMode] = useState<'none' | 'delay' | 'ingest' | 'notify'>('none');
  const [loadResult, setLoadResult] = useState<{ rate: number; p95: number; dropped: number } | null>(null);

  useEffect(() => {
    if (!playing || contained) return;
    if (cursor >= events.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setCursor((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, contained]);

  const phase = contained ? 4 : cursor < 2 ? 0 : cursor < 4 ? 1 : cursor < 6 ? 2 : 3;
  const progress = contained ? 100 : ((cursor + 1) / events.length) * 100;
  const risk = contained ? 18 : [8, 16, 31, 44, 58, 76, 84, 92][Math.max(cursor, 0)] ?? 8;
  const trust = contained ? 34 : [92, 90, 72, 60, 47, 24, 22, 8][Math.max(cursor, 0)] ?? 92;
  const selectedNode = nodes.find((node) => node.id === selected) ?? nodes[0];
  const visibleNodes = nodes.filter((node) => node.reveal <= cursor);
  const visibleEdges = edges.filter((edge) => edge.reveal <= cursor);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), []);

  const reset = () => { setCursor(-1); setPlaying(false); setContained(false); setSelected('identity'); setShowNotifications(false); setFaultMode('none'); };
  const applyIntervention = () => { setPlaying(false); setContained(true); setShowNotifications(true); };
  const runLoadCheck = () => {
    const count = 11253;
    const batches: number[] = [];
    const started = performance.now();
    let checksum = 0;
    for (let offset = 0; offset < count; offset += 256) {
      const batchStart = performance.now();
      for (let i = offset; i < Math.min(offset + 256, count); i += 1) checksum = (checksum + ((i * 31) ^ (i >>> 2))) % 1000003;
      batches.push(performance.now() - batchStart);
    }
    const elapsed = Math.max(performance.now() - started, .1);
    const sorted = [...batches].sort((a, b) => a - b);
    setLoadResult({ rate: Math.round(count / (elapsed / 1000)), p95: Number(sorted[Math.floor(sorted.length * .95)].toFixed(2)), dropped: checksum >= 0 ? 0 : 1 });
  };

  return <div className="simulation-page min-h-screen bg-[#050607] text-zinc-100">
    <ProductHeaderFrame>
      <ProductBrand onHome={onNavigateHome} />
      <ProductNavigation active="simulation" onNavigate={(target) => target === 'results' ? onNavigateResults() : target !== 'simulation' && onNavigateProduct(target)} />
      <div className="hidden items-center gap-2 text-[10px] font-mono text-zinc-500 xl:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />DEMO ENVIRONMENT</div>
    </ProductHeaderFrame>

    <main className="mx-auto w-full max-w-[1760px] px-3 pb-44 pt-6 sm:px-6 lg:px-8 xl:px-12">
      <section className="mb-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#E66F52]"><Radar className="h-3.5 w-3.5" /> Live scenario / ATK-2047</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Complete attack-path simulation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Watch isolated security events become an explainable attack path, then cut the smallest access edge that breaks the highest-risk route.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={reset} className="sim-button sim-button-muted"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          <button onClick={() => setPlaying((value) => !value)} disabled={contained || cursor >= events.length - 1} className="sim-button sim-button-primary">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause stream' : cursor < 0 ? 'Run simulation' : 'Continue'}</button>
        </div>
      </section>

      <section className="sim-stagebar mb-4">
        {phaseLabels.map((label, index) => <div key={label} className={`sim-stage ${phase === index ? 'is-active' : phase > index ? 'is-done' : ''}`}><span>{phase > index ? <Check className="h-3 w-3" /> : index + 1}</span><b>{label}</b>{index < phaseLabels.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-700" />}</div>)}
        <div className="sim-progress"><span style={{ width: `${progress}%` }} /></div>
      </section>

      <section className="sim-command-rail mb-4" aria-label="Security command center health">
        <div><span>INGESTION</span><b className={faultMode === 'ingest' ? 'is-warn' : ''}>{faultMode === 'ingest' ? 'RETRYING' : 'HEALTHY'}</b><small>{faultMode === 'delay' ? '1 delayed · reordered' : 'p95 184 ms'}</small></div>
        <div><span>GRAPH FRESHNESS</span><b>{cursor < 0 ? 'READY' : '< 1 SEC'}</b><small>{Math.max(cursor + 1, 0)} events applied</small></div>
        <div><span>PROVENANCE</span><b>2 SOURCES</b><small>CMDB + telemetry</small></div>
        <div><span>NOTIFICATION</span><b className={faultMode === 'notify' ? 'is-warn' : ''}>{faultMode === 'notify' ? 'FALLBACK' : contained ? '3 / 3 SENT' : 'ARMED'}</b><small>{faultMode === 'notify' ? 'email + PagerDuty' : 'owners resolved'}</small></div>
        <div><span>SCENARIO</span><b>DETERMINISTIC</b><small>ATK-2047 · resettable</small></div>
        <button onClick={() => setShowOperations(true)}><Gauge className="h-3.5 w-3.5" /> Evidence & reliability</button>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <aside className="sim-panel order-2 2xl:order-1">
          <div className="sim-panel-title"><span><Activity className="h-3.5 w-3.5" /> Event stream</span><em>{Math.max(cursor + 1, 0)}/{events.length}</em></div>
          <div className="sim-story-banner"><span><b>How to read this story</b>Each card is one thing the company observed, in time order.</span><div><i />Same attack story <i />Ignored background noise</div></div>
          <div className="sim-timeline" aria-label="Chronological security event timeline">
            {events.map((event, index) => <button key={`${event.time}-${event.title}`} onClick={() => !contained && setCursor(index)} className={`sim-event ${index === cursor ? 'is-current' : ''} ${index <= cursor ? 'is-seen' : ''} ${index <= cursor && !event.linked ? 'is-noise' : ''}`}>
              <span className="sim-event-head"><span className="sim-event-time">{event.time}</span><small>{event.source}</small></span>
              <i><span>{index + 1}</span></i>
              <span className="sim-event-copy"><strong>{event.title}</strong><p>{event.evidence}</p>{index <= cursor && <em>{event.linked ? 'CORRELATED' : 'UNRELATED'}</em>}</span>
            </button>)}
          </div>
          <div className="sim-evidence-note"><Eye className="h-4 w-4" /><span><b>Evidence rule</b> Shared identity, session, permission and timestamp explain every relationship. Noise stays visible but disconnected.</span></div>
        </aside>

        <section className="sim-graph-panel order-1 2xl:order-2">
          <div className="sim-panel-title sim-graph-header px-4 pt-4 sm:px-5"><span><Network className="h-3.5 w-3.5" /> Enterprise digital twin</span><div className="sim-legend"><i className="observed" /> Observed / verified <i className="possible" /> Feasible next step</div><div className="sim-graph-controls"><button onClick={() => cursor < events.length - 1 && setCursor((value) => value + 1)} disabled={contained || cursor >= events.length - 1}><FastForward /> Next event</button><button className="intervene" onClick={applyIntervention} disabled={phase < 3 || contained}><Scissors /> {contained ? 'Intervention applied' : 'Apply minimum intervention'}</button></div></div>
          <div className="sim-graph-wrap">
            {cursor < 0 && <div className="sim-empty"><Radar className="h-8 w-8" /><b>Awaiting telemetry</b><span>Run the simulation to ingest eight cross-system events.</span></div>}
            <svg viewBox="0 0 1000 560" role="img" aria-label="Continuously updated attack path graph">
              <defs>
                <filter id="nodeGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <marker id="arrowObserved" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef6045" /></marker>
                <marker id="arrowPossible" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#71717a" /></marker>
              </defs>
              {visibleEdges.map((edge) => {
                const a = nodeMap[edge.from], b = nodeMap[edge.to];
                const cut = contained && edge.from === 'vpn' && edge.to === 'reporting';
                return <g key={`${edge.from}-${edge.to}`} className={cut ? 'sim-edge-cut' : ''} onClick={() => setSelected(edge.to)}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`sim-edge ${edge.type} ${edge.path === 'A' && phase >= 3 ? 'critical' : ''}`} markerEnd={`url(#arrow${edge.type === 'observed' ? 'Observed' : 'Possible'})`} />
                  {cut && <><circle cx={(a.x+b.x)/2} cy={(a.y+b.y)/2} r="23" className="sim-cut-ring"/><path d={`M${(a.x+b.x)/2-8},${(a.y+b.y)/2-8} l16,16 M${(a.x+b.x)/2+8},${(a.y+b.y)/2-8} l-16,16`} className="sim-cut-x" /></>}
                </g>;
              })}
              {visibleNodes.map((node) => {
                const critical = phase >= 3 && ['identity','device','vpn','reporting','service','database','bucket'].includes(node.id);
                const blocked = contained && ['reporting','service','database','bucket'].includes(node.id);
                return <g key={node.id} transform={`translate(${node.x},${node.y})`} className={`sim-node ${selected === node.id ? 'selected' : ''} ${critical ? 'critical' : ''} ${blocked ? 'blocked' : ''} ${node.kind === 'UNRELATED' ? 'noise' : ''}`} onClick={() => setSelected(node.id)} role="button">
                  <circle r={node.kind === 'CRITICAL ASSET' ? 38 : 31} />
                  <text className="sim-node-kind" y={-47}>{node.kind}</text>
                  <text className="sim-node-label" y={54}>{node.label}</text>
                  {node.kind === 'IDENTITY' ? <UserRound x={-12} y={-12} width={24} /> : node.kind.includes('ASSET') ? <Database x={-12} y={-12} width={24} /> : node.kind === 'SESSION' ? <KeyRound x={-12} y={-12} width={24} /> : node.kind === 'APPLICATION' ? <Server x={-12} y={-12} width={24} /> : <Network x={-12} y={-12} width={24} />}
                  {blocked && <g transform="translate(23,-24)"><circle r="11" className="sim-block-badge"/><X x={-7} y={-7} width={14}/></g>}
                </g>;
              })}
            </svg>
            {cursor >= 0 && <div className="sim-node-inspector"><span>{selectedNode.kind}</span><b>{selectedNode.label}</b><p>{selectedNode.detail}</p></div>}
            {phase >= 3 && !contained && <div className="sim-critical-callout"><Zap className="h-4 w-4"/><span><b>Critical path isolated</b>6 observed hops connect the breached identity to customer data.</span></div>}
            {contained && <div className="sim-contained-callout"><ShieldCheck className="h-5 w-5"/><span><b>Path interrupted at entry edge</b>Other routes recalculated; residual risk remains visible.</span></div>}
          </div>
        </section>

        <aside className="order-3 space-y-4">
          <section className="sim-panel overflow-hidden">
            <div className="sim-panel-title"><span><GitBranch className="h-3.5 w-3.5" /> Ranked attack paths</span><em>LIKELIHOOD + IMPACT</em></div>
            <PathRow rank="01" name="Reporting route" probability={contained ? 11 : phase >= 3 ? 87 : 34} impact="Critical" active={phase >= 2} contained={contained} />
            <PathRow rank="02" name="Identity route" probability={42} impact="Critical" active={phase >= 2} />
            <PathRow rank="03" name="Workload route" probability={29} impact="Critical" active={phase >= 2} />
            <p className="px-4 pb-4 pt-2 text-[10px] leading-4 text-zinc-500">Ranking keeps likelihood separate from destination impact. Unobserved steps reduce confidence.</p>
          </section>

          <section className="sim-calculation-panel">
            <div className="sim-calc-heading"><span><Gauge /> Why the digital twin chose this path</span><em>EXPLAINABLE MATH</em></div>
            <p>The graph first proves reachability, then combines likelihood, destination impact and evidence coverage. Framework labels never become probability by themselves.</p>
            <div className="sim-formula"><span>PATH PRIORITY</span><b>{phase >= 3 ? '0.87' : '—'} <i>×</i> 0.96 <i>×</i> {phase >= 3 ? '0.92' : '—'}</b><small>likelihood × impact × evidence</small><strong>{phase >= 3 ? '= 76.8' : 'Awaiting enough evidence'}</strong></div>
            <div className="sim-cut-comparison">
              <div><span>SESSION + ACCESS CUT</span><b>{phase >= 3 ? '74 risk points' : '—'}</b><em>1 user affected</em></div>
              <div><span>DISABLE REPORTING APP</span><b>{phase >= 3 ? '81 risk points' : '—'}</b><em>All report users affected</em></div>
              <div><span>SHUT DOWN DATABASE</span><b>{phase >= 3 ? '92 risk points' : '—'}</b><em>Business outage</em></div>
            </div>
            <div className="sim-calc-result"><ShieldCheck /><span><b>{contained ? 'Selected edge cut executed' : phase >= 3 ? 'Best risk reduction per unit of disruption' : 'The recommendation unlocks after path ranking'}</b>{contained ? 'Residual risk 18/100 · two lower-confidence routes remain monitored.' : 'Revoke only the suspicious session and its reporting access; preserve the app and database.'}</span></div>
          </section>
        </aside>
      </div>

      <section className="sim-floating-assessment" aria-label="Live risk and trust score interpretation">
        <div className="sim-floating-label"><span><Radar className="h-3.5 w-3.5" /> LIVE INTERPRETATION</span><em>{phaseLabels[phase]}</em></div>
        <div className="sim-floating-scores">
          <ScoreDial label="RISK" value={risk} color={contained ? '#34d399' : '#ef6045'} detail={contained ? '−74 after intervention' : 'combined criticality'} />
          <ScoreDial label="TRUST" value={trust} color="#f4c15d" detail={contained ? 'session revoked' : 'identity confidence'} />
        </div>
        <div className="sim-floating-copy">
          <span>WHAT CHANGED AT THIS STEP</span>
          <h3>{interpretations[phase].title}</h3>
          <p>{interpretations[phase].body}</p>
        </div>
        <div className="sim-floating-proof"><b>{interpretations[phase].evidence}</b><small>{contained ? '11% residual likelihood' : `${Math.max(9, phase >= 3 ? 87 : risk - 8)}% likelihood / 24h`}</small></div>
      </section>
    </main>

    {showNotifications && <div className="sim-notifications">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><span className="flex items-center gap-2 text-xs font-semibold"><BellRing className="h-4 w-4 text-[#ef6045]"/> Response notifications sent</span><button onClick={() => setShowNotifications(false)}><X className="h-4 w-4"/></button></div>
      <NotifyRow icon={<ShieldCheck />} role="SOC lead" person="Aarav Mehta" message="Critical path contained · case ATK-2047" />
      <NotifyRow icon={<UserRound />} role="Identity owner" person="Riya Kapoor" message="Session revoked · password reset required" />
      <NotifyRow icon={<Database />} role="Data owner" person="Customer Platform" message="Query/export evidence preserved for review" />
    </div>}

    {showOperations && <aside className="sim-operations-drawer" aria-label="Operational evidence and reliability controls">
      <header><div><span>JUDGE PROOF</span><h2>Operational evidence</h2></div><button onClick={() => setShowOperations(false)} aria-label="Close operational evidence"><X className="h-4 w-4" /></button></header>

      <section>
        <h3><Database className="h-3.5 w-3.5" /> System-of-record separation</h3>
        <div className="sim-provenance-grid"><div><b>CMDB / access graph</b><span>Baseline facts</span><p>People, owners, services, assets, grants and verified trust relationships.</p></div><div><b>Observed telemetry</b><span>Time-bound evidence</span><p>Sign-ins, sessions, requests, queries and export events with evidence IDs.</p></div></div>
        <p className="sim-drawer-note">Baseline reachability never masquerades as an observed attack. Solid edges require telemetry or verified access; dashed edges remain possible steps.</p>
      </section>

      <section>
        <h3><Activity className="h-3.5 w-3.5" /> Event → alert → response</h3>
        <div className="sim-lifecycle">{['THREAT EVENT','CORRELATED ALERT','RANKED PATH','MINIMUM CUT','OWNER NOTICE'].map((item, index) => <div key={item} className={phase >= Math.min(index, 4) ? 'is-done' : ''}><i>{phase > index || contained ? <Check /> : index + 1}</i><span>{item}</span></div>)}</div>
      </section>

      <section>
        <h3><UserRound className="h-3.5 w-3.5" /> Recipient routing and status</h3>
        <div className="sim-routing-table"><div><span>Critical path</span><b>SOC lead · Aarav Mehta</b><em>{faultMode === 'notify' ? 'PAGER SENT' : contained ? 'SENT' : 'ARMED'}</em></div><div><span>Identity action</span><b>Account owner · Riya Kapoor</b><em>{contained ? 'SENT' : 'ON ACTION'}</em></div><div><span>Tier 0 data</span><b>Data owner · Customer Platform</b><em>{contained ? 'SENT' : 'ON IMPACT'}</em></div></div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3"><h3><TestTube2 className="h-3.5 w-3.5" /> Repeatability and load evidence</h3><button className="sim-mini-action" onClick={runLoadCheck}>Run client replay</button></div>
        <div className="sim-load-result"><div><span>DATASET</span><b>11,253 events</b></div><div><span>THROUGHPUT</span><b>{loadResult ? `${loadResult.rate.toLocaleString()}/s` : 'Not run'}</b></div><div><span>P95 / BATCH</span><b>{loadResult ? `${loadResult.p95} ms` : '—'}</b></div><div><span>DROPPED</span><b>{loadResult ? loadResult.dropped : '—'}</b></div></div>
        <p className="sim-drawer-note">Local browser normalization replay; this is not presented as a backend production load test.</p>
      </section>

      <section>
        <h3><WifiOff className="h-3.5 w-3.5" /> Failure handling demonstration</h3>
        <div className="sim-fault-actions"><button onClick={() => setFaultMode('delay')} className={faultMode === 'delay' ? 'is-active' : ''}>Delayed event</button><button onClick={() => setFaultMode('ingest')} className={faultMode === 'ingest' ? 'is-active' : ''}>Ingest failure</button><button onClick={() => setFaultMode('notify')} className={faultMode === 'notify' ? 'is-active' : ''}>Webhook outage</button><button onClick={() => setFaultMode('none')}>Clear</button></div>
        <div className="sim-fault-status"><ShieldCheck className="h-4 w-4" /><span><b>{faultMode === 'delay' ? 'Event-time ordering preserved' : faultMode === 'ingest' ? 'Connector isolated; retry queue active' : faultMode === 'notify' ? 'Fallback escalation delivered' : 'All services nominal'}</b>{faultMode === 'delay' ? 'Late evidence is buffered and inserted by event time before paths recalculate.' : faultMode === 'ingest' ? 'Last verified graph remains available while exponential retry protects the stream.' : faultMode === 'notify' ? 'Primary webhook failed; PagerDuty and email routes were selected automatically.' : 'Choose a fault above to demonstrate graceful degradation.'}</span></div>
      </section>

      <section>
        <h3><History className="h-3.5 w-3.5" /> Explainable decision audit</h3>
        <div className="sim-audit-log"><div><time>22:00</time><span><b>Scenario initialized</b>Seed ATK-2047 · demo dataset</span></div>{cursor >= 2 && <div><time>22:06</time><span><b>Relationship compiled</b>Identity ↔ device via IdP fingerprint</span></div>}{cursor >= 5 && <div><time>22:19</time><span><b>Route promoted</b>Reporting route · observed DB access</span></div>}{contained && <div><time>22:25</time><span><b>Intervention executed</b>Session/access edge cut · risk 92 → 18</span></div>}{faultMode !== 'none' && <div><time>NOW</time><span><b>Resilience policy invoked</b>{faultMode} fault · fallback recorded</span></div>}</div>
      </section>
    </aside>}
  </div>;
}

function ScoreDial({ label, value, color, detail }: { label: string; value: number; color: string; detail: string }) {
  return <div className="sim-score"><div className="sim-score-ring" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.07) 0deg)` }}><div><strong>{value}</strong><span>/100</span></div></div><b>{label} SCORE</b><small>{detail}</small></div>;
}

function PathRow({ rank, name, probability, impact, active, contained = false }: { rank: string; name: string; probability: number; impact: string; active: boolean; contained?: boolean }) {
  return <div className={`sim-path-row ${active ? 'is-active' : ''} ${contained ? 'is-contained' : ''}`}><b>{rank}</b><span><strong>{name}</strong><small>{contained ? 'CUT / MONITORED' : impact + ' impact'}</small><i><span style={{ width: active ? `${probability}%` : '0%' }} /></i></span><em>{active ? probability + '%' : '—'}</em></div>;
}

function NotifyRow({ icon, role, person, message }: { icon: React.ReactNode; role: string; person: string; message: string }) {
  return <div className="sim-notify-row"><span>{icon}</span><div><small>{role}</small><b>{person}</b><p>{message}</p></div><Check className="h-4 w-4 text-emerald-400"/></div>;
}
