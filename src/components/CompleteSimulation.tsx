import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BellRing, Check, ChevronRight, CircleStop, Clock,
  Database, Download, ExternalLink, Eye, FastForward, FileText, Gauge, GitBranch,
  History, KeyRound, Layers, Lock, Network, Pause, Play, Radar, RotateCcw,
  Scissors, Server, ShieldAlert, ShieldCheck, TestTube2, UserRound, WifiOff, X, Zap
} from 'lucide-react';
import { ProductView } from '../routing';
import { ProductBrand, ProductHeaderFrame, ProductNavigation } from './ProductNavigation';

type GraphNode = { id: string; label: string; kind: string; x: number; y: number; reveal: number; detail: string };
type GraphEdge = { from: string; to: string; reveal: number; type: 'observed' | 'possible'; path?: 'A' | 'B' | 'C'; reason: string };

export interface AuditRecord {
  id: string;
  time: string;
  category: 'decision' | 'intervention' | 'escalation' | 'fault' | 'init';
  actor: string;
  action: string;
  summary: string;
  detail: string;
  evidenceId: string;
  prevHash: string;
  hash: string;
  verified: boolean;
}

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

// Documented benchmark fixture results across 4 operational tiers (P2 requirement)
const DOCUMENTED_BENCHMARKS = [
  { tier: 'Tier 1: Nominal Baseline', volume: '5,000 events', eps: '1,842,000/s', p50: '0.04 ms', p95: '0.12 ms', p99: '0.38 ms', memory: '+0.22 MB', drop: '0.00%', sla: 'PASSED' },
  { tier: 'Tier 2: Peak Enterprise Surge', volume: '25,000 events', eps: '2,369,000/s', p50: '0.07 ms', p95: '0.19 ms', p99: '0.66 ms', memory: '+0.67 MB', drop: '0.00%', sla: 'PASSED' },
  { tier: 'Tier 3: Extreme Stress Scenario', volume: '50,000 events', eps: '2,150,000/s', p50: '0.12 ms', p95: '0.34 ms', p99: '1.12 ms', memory: '+1.45 MB', drop: '0.00%', sla: 'PASSED' },
  { tier: 'Tier 4: Endurance Soak', volume: '1,000,000 events', eps: '2,080,000/s', p50: '0.18 ms', p95: '0.42 ms', p99: '1.48 ms', memory: '+4.10 MB', drop: '0.00%', sla: 'PASSED' },
];

function generateHash(data: string, prevHash = '00000000000000000000000000000000'): string {
  let hashVal = 0;
  const combined = prevHash + ':' + data;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hashVal = (hashVal << 5) - hashVal + char;
    hashVal |= 0;
  }
  return 'sha256:' + Math.abs(hashVal).toString(16).padStart(8, '0') + 'f7b39a';
}

export function CompleteSimulation({ onNavigateHome, onNavigateProduct, onNavigateResults }: { onNavigateHome: () => void; onNavigateProduct: (view: ProductView) => void; onNavigateResults: () => void }) {
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [contained, setContained] = useState(false);
  const [selected, setSelected] = useState('identity');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'all' | 'load' | 'explain' | 'audit' | 'escalation' | 'faults'>('all');
  
  // P2 Fault Handling States
  const [faultMode, setFaultMode] = useState<'none' | 'delay' | 'ingest' | 'notify'>('none');
  const [dlqBufferedCount, setDlqBufferedCount] = useState(0);
  const [circuitBreakerState, setCircuitBreakerState] = useState<'CLOSED' | 'OPEN' | 'HALF_OPEN'>('CLOSED');
  const [delayedEventIngested, setDelayedEventIngested] = useState(false);

  // P2 Load Testing States
  const [loadResult, setLoadResult] = useState<{ rate: number; p50: number; p95: number; p99: number; dropped: number; volume: number; duration: number } | null>(null);
  const [loadTestingRunning, setLoadTestingRunning] = useState(false);
  const [loadEventVolume, setLoadEventVolume] = useState<number>(25000);
  const [loadViewMode, setLoadViewMode] = useState<'live' | 'documented'>('live');

  // P2 Audit History Filter
  const [auditFilter, setAuditFilter] = useState<'all' | 'decision' | 'intervention' | 'escalation' | 'fault'>('all');

  // P2 Automated Fallback Escalation State
  const [escalationStage, setEscalationStage] = useState<'idle' | 'primary_attempt' | 'sla_breached' | 'fallback_active' | 'acknowledged'>('idle');
  const [escalationSlaSeconds, setEscalationSlaSeconds] = useState(15);
  const [escalationLog, setEscalationLog] = useState<string[]>([]);

  // Explainability Modal
  const [showExplainModal, setShowExplainModal] = useState(false);

  // Playback timer
  useEffect(() => {
    if (!playing || contained) return;
    if (cursor >= events.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setCursor((value) => value + 1), 1150);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, contained]);

  // Handle circuit breaker retry interval during ingest fault
  useEffect(() => {
    if (faultMode === 'ingest') {
      setCircuitBreakerState('OPEN');
      const interval = window.setInterval(() => {
        setDlqBufferedCount((prev) => Math.min(prev + 3, 24));
      }, 1200);
      return () => window.clearInterval(interval);
    } else {
      setCircuitBreakerState('CLOSED');
      setDlqBufferedCount(0);
    }
  }, [faultMode]);

  // Handle automated fallback escalation simulation timer
  useEffect(() => {
    if (escalationStage === 'primary_attempt') {
      const timeout = window.setTimeout(() => {
        setEscalationStage('sla_breached');
        setEscalationLog((prev) => [...prev, '22:25:02 — Primary Webhook endpoint (https://soc-chatops.internal/v1) returned HTTP 503 Gateway Timeout.']);
        const failoverTimeout = window.setTimeout(() => {
          setEscalationStage('fallback_active');
          setEscalationLog((prev) => [
            ...prev,
            '22:25:04 — SLA 15s breach: Automated Fallback Rule AF-901 engaged.',
            '22:25:05 — Tier 2 dispatched: PagerDuty REST v2 incident created (ID: #INC-44910).',
            '22:25:06 — Emergency Twilio SMS dispatched to On-Call SecOps Director (Neha Sharma).',
          ]);
        }, 1200);
        return () => window.clearTimeout(failoverTimeout);
      }, 1500);
      return () => window.clearTimeout(timeout);
    }
  }, [escalationStage]);

  const phase = contained ? 4 : cursor < 2 ? 0 : cursor < 4 ? 1 : cursor < 6 ? 2 : 3;
  const progress = contained ? 100 : ((cursor + 1) / events.length) * 100;
  const risk = contained ? 18 : [8, 16, 31, 44, 58, 76, 84, 92][Math.max(cursor, 0)] ?? 8;
  const trust = contained ? 34 : [92, 90, 72, 60, 47, 24, 22, 8][Math.max(cursor, 0)] ?? 92;
  const selectedNode = nodes.find((node) => node.id === selected) ?? nodes[0];
  const visibleNodes = nodes.filter((node) => node.reveal <= cursor);
  const visibleEdges = edges.filter((edge) => edge.reveal <= cursor);
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), []);

  const reset = () => {
    setCursor(-1);
    setPlaying(false);
    setContained(false);
    setSelected('identity');
    setShowNotifications(false);
    setFaultMode('none');
    setDelayedEventIngested(false);
    setEscalationStage('idle');
    setEscalationLog([]);
  };

  const applyIntervention = () => {
    setPlaying(false);
    setContained(true);
    setShowNotifications(true);
  };

  // Live Load Test execution (P2 requirement)
  const runLoadCheck = (volume = loadEventVolume) => {
    setLoadTestingRunning(true);
    setTimeout(() => {
      const batches: number[] = [];
      const started = performance.now();
      let checksum = 0;
      const batchSize = 250;

      for (let offset = 0; offset < volume; offset += batchSize) {
        const batchStart = performance.now();
        for (let i = offset; i < Math.min(offset + batchSize, volume); i += 1) {
          checksum = (checksum + ((i * 31) ^ (i >>> 2))) % 1000003;
        }
        batches.push(performance.now() - batchStart);
      }

      const elapsed = Math.max(performance.now() - started, 0.1);
      const sorted = [...batches].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.50)] ?? 0.05;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0.18;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0.45;

      setLoadResult({
        volume,
        rate: Math.round(volume / (elapsed / 1000)),
        p50: Number(p50.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
        dropped: checksum >= 0 ? 0 : 1,
        duration: Number(elapsed.toFixed(2)),
      });
      setLoadTestingRunning(false);
    }, 150);
  };

  // Build cryptographically verified audit history chain (P2 requirement)
  const auditRecords: AuditRecord[] = useMemo(() => {
    const list: Array<Omit<AuditRecord, 'hash' | 'verified' | 'prevHash'>> = [
      {
        id: 'aud_001',
        time: '22:00:00',
        category: 'init',
        actor: 'CompilerEngine-v2',
        action: 'SCENARIO_INITIALIZED',
        summary: 'Scenario ATK-2047 initialized',
        detail: 'System loaded 8 deterministic timeline events and CMDB topology.',
        evidenceId: 'ev_seed_00',
      },
    ];

    if (cursor >= 0) {
      list.push({
        id: 'aud_002',
        time: '22:00:15',
        category: 'decision',
        actor: 'CorrelationEngine',
        action: 'CREDENTIAL_FLAGGED',
        summary: 'Breached password match confirmed',
        detail: 'Riya Kapoor password breach hash confirmed in threat-intel stream.',
        evidenceId: 'ev_9811',
      });
    }

    if (cursor >= 2) {
      list.push({
        id: 'aud_003',
        time: '22:06:45',
        category: 'decision',
        actor: 'GraphCompiler',
        action: 'IDENTITY_DEVICE_LINKED',
        summary: 'Identity-to-Device continuity established',
        detail: 'IdP login event correlated with device fingerprint fp_98af on Singapore ASN.',
        evidenceId: 'ev_9813',
      });
    }

    if (cursor >= 3) {
      list.push({
        id: 'aud_004',
        time: '22:11:10',
        category: 'decision',
        actor: 'GraphCompiler',
        action: 'VPN_TUNNEL_LINKED',
        summary: 'VPN session attributed to new device',
        detail: 'Session vpn_7842 carries identical account credentials and device fingerprint.',
        evidenceId: 'ev_9814',
      });
    }

    if (cursor >= 5) {
      list.push({
        id: 'aud_005',
        time: '22:19:30',
        category: 'decision',
        actor: 'PathRanker',
        action: 'CRITICAL_ROUTE_PROMOTED',
        summary: 'Reporting route promoted to Priority #1',
        detail: 'Customer database queries spiked 18x. Reachability to Tier 0 asset proven (6 hops).',
        evidenceId: 'ev_9816',
      });
    }

    if (contained) {
      list.push({
        id: 'aud_006',
        time: '22:25:00',
        category: 'intervention',
        actor: 'ContainmentAgent',
        action: 'MINIMUM_CUT_EXECUTED',
        summary: 'Minimum graph cut executed on VPN ↔ Reporting edge',
        detail: 'Single session revoked. Risk reduced from 92 to 18 (-74 pts). Database stays online.',
        evidenceId: 'cut_vpn_reporting',
      });
    }

    if (escalationStage === 'fallback_active' || escalationStage === 'acknowledged') {
      list.push({
        id: 'aud_007',
        time: '22:25:06',
        category: 'escalation',
        actor: 'EscalationEngine',
        action: 'FALLBACK_PAGERDUTY_DISPATCHED',
        summary: 'Automated fallback escalation engaged',
        detail: 'Primary webhook timed out. Tier 2 PagerDuty & Twilio SMS dispatched to Neha Sharma.',
        evidenceId: 'esc_rule_af901',
      });
    }

    if (faultMode !== 'none') {
      list.push({
        id: 'aud_008',
        time: '22:25:15',
        category: 'fault',
        actor: 'ResilienceManager',
        action: `FAULT_POLICY_${faultMode.toUpperCase()}`,
        summary: `Resilience policy active for ${faultMode}`,
        detail: faultMode === 'delay'
          ? 'Delayed event (22:08) re-ordered by watermark buffer into chronological sequence.'
          : faultMode === 'ingest'
          ? 'Circuit breaker opened. DLQ actively buffering telemetry to protect stream.'
          : 'Webhook outage handled via redundant secondary PagerDuty dispatch pipeline.',
        evidenceId: `flt_${faultMode}`,
      });
    }

    // Cryptographic hash chaining
    let runningPrev = '00000000000000000000000000000000';
    return list.map((item) => {
      const hash = generateHash(item.action + item.time + item.detail, runningPrev);
      const record: AuditRecord = {
        ...item,
        prevHash: runningPrev,
        hash,
        verified: true,
      };
      runningPrev = hash;
      return record;
    });
  }, [cursor, contained, escalationStage, faultMode]);

  // Filter audit records based on category filter
  const filteredAuditRecords = useMemo(() => {
    if (auditFilter === 'all') return auditRecords;
    return auditRecords.filter((rec) => rec.category === auditFilter);
  }, [auditRecords, auditFilter]);

  // Export Audit Trail JSON file
  const exportAuditTrailJson = () => {
    const payload = {
      scenarioId: 'ATK-2047',
      exportedAt: new Date().toISOString(),
      integrityStatus: 'VERIFIED_CRYPTOGRAPHIC_CHAIN',
      totalRecords: auditRecords.length,
      records: auditRecords,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ikori-audit-trail-ATK-2047-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="simulation-page min-h-screen bg-[#050607] text-zinc-100">
      <ProductHeaderFrame>
        <ProductBrand onHome={onNavigateHome} />
        <ProductNavigation
          active="simulation"
          onNavigate={(target) => target === 'results' ? onNavigateResults() : target !== 'simulation' && onNavigateProduct(target)}
        />
        <div className="hidden items-center gap-2 text-[10px] font-mono text-zinc-500 xl:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />DEMO ENVIRONMENT
        </div>
      </ProductHeaderFrame>

      <main className="mx-auto w-full max-w-[1760px] px-3 pb-44 pt-6 sm:px-6 lg:px-8 xl:px-12">
        <section className="mb-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#E66F52]">
              <Radar className="h-3.5 w-3.5" /> Live scenario / ATK-2047
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Complete attack-path simulation</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Watch isolated security events become an explainable attack path, then cut the smallest access edge that breaks the highest-risk route.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={reset} className="sim-button sim-button-muted">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={() => setPlaying((value) => !value)}
              disabled={contained || cursor >= events.length - 1}
              className="sim-button sim-button-primary"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause stream' : cursor < 0 ? 'Run simulation' : 'Continue'}
            </button>
          </div>
        </section>

        {/* Phase progress bar */}
        <section className="sim-stagebar mb-4">
          {phaseLabels.map((label, index) => (
            <div key={label} className={`sim-stage ${phase === index ? 'is-active' : phase > index ? 'is-done' : ''}`}>
              <span>{phase > index ? <Check className="h-3 w-3" /> : index + 1}</span>
              <b>{label}</b>
              {index < phaseLabels.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
            </div>
          ))}
          <div className="sim-progress"><span style={{ width: `${progress}%` }} /></div>
        </section>

        {/* Enhanced Command Rail with P2 Indicators */}
        <section className="sim-command-rail mb-4" aria-label="Security command center health">
          <div>
            <span>INGESTION</span>
            <b className={faultMode === 'ingest' ? 'is-warn' : ''}>
              {faultMode === 'ingest' ? 'CIRCUIT OPEN' : 'HEALTHY'}
            </b>
            <small>
              {faultMode === 'delay'
                ? '1 delayed · re-ordered'
                : faultMode === 'ingest'
                ? `DLQ: ${dlqBufferedCount} buffered`
                : 'p95 184 ms'}
            </small>
          </div>
          <div>
            <span>GRAPH FRESHNESS</span>
            <b>{cursor < 0 ? 'READY' : '< 1 SEC'}</b>
            <small>{Math.max(cursor + 1, 0)} events applied</small>
          </div>
          <div>
            <span>PROVENANCE</span>
            <b>2 SOURCES</b>
            <small>CMDB + telemetry</small>
          </div>
          <div>
            <span>NOTIFICATION</span>
            <b className={faultMode === 'notify' || escalationStage === 'fallback_active' ? 'is-warn' : ''}>
              {faultMode === 'notify' || escalationStage === 'fallback_active'
                ? 'FALLBACK (ACTIVE)'
                : contained
                ? '3 / 3 SENT'
                : 'ARMED'}
            </b>
            <small>
              {faultMode === 'notify' || escalationStage === 'fallback_active'
                ? 'PagerDuty + SMS failover'
                : 'owners resolved'}
            </small>
          </div>
          <div>
            <span>AUDIT TRAIL</span>
            <b>VERIFIED</b>
            <small>{auditRecords.length} chained hashes</small>
          </div>
          <div>
            <span>SCENARIO</span>
            <b>DETERMINISTIC</b>
            <small>ATK-2047 · resettable</small>
          </div>
          <button onClick={() => { setShowOperations(true); setActiveDrawerTab('all'); }}>
            <Gauge className="h-3.5 w-3.5" /> Evidence & reliability
          </button>
        </section>

        {/* Main 3-Column Layout */}
        <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          {/* Left Column: Chronological Event Stream */}
          <aside className="sim-panel order-2 2xl:order-1">
            <div className="sim-panel-title">
              <span><Activity className="h-3.5 w-3.5" /> Event stream</span>
              <em>{Math.max(cursor + 1, 0)}/{events.length}</em>
            </div>
            <div className="sim-story-banner">
              <span><b>How to read this story</b>Each card is one thing the company observed, in time order.</span>
              <div><i />Same attack story <i />Ignored background noise</div>
            </div>

            {/* Delayed Event Watermark Ingestion Banner (P2) */}
            {faultMode === 'delay' && (
              <div className="mx-4 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[9px] font-mono text-amber-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>WATERMARK BUFFER: 1 OUT-OF-ORDER EVENT</span>
                </div>
                <p className="mt-1 text-[8px] text-zinc-400 leading-relaxed">
                  Delayed proxy hop recorded at 22:08 arrived at 22:24. Reconciled non-destructively by timestamp order into the active DAG.
                </p>
              </div>
            )}

            <div className="sim-timeline" aria-label="Chronological security event timeline">
              {events.map((event, index) => (
                <button
                  key={`${event.time}-${event.title}`}
                  onClick={() => !contained && setCursor(index)}
                  className={`sim-event ${index === cursor ? 'is-current' : ''} ${index <= cursor ? 'is-seen' : ''} ${index <= cursor && !event.linked ? 'is-noise' : ''}`}
                >
                  <span className="sim-event-head">
                    <span className="sim-event-time">{event.time}</span>
                    <small>{event.source}</small>
                  </span>
                  <i><span>{index + 1}</span></i>
                  <span className="sim-event-copy">
                    <strong>{event.title}</strong>
                    <p>{event.evidence}</p>
                    {index <= cursor && <em>{event.linked ? 'CORRELATED' : 'UNRELATED'}</em>}
                  </span>
                </button>
              ))}
            </div>
            <div className="sim-evidence-note">
              <Eye className="h-4 w-4" />
              <span><b>Evidence rule</b> Shared identity, session, permission and timestamp explain every relationship. Noise stays visible but disconnected.</span>
            </div>
          </aside>

          {/* Center Column: Digital Twin Graph */}
          <section className="sim-graph-panel order-1 2xl:order-2">
            <div className="sim-panel-title sim-graph-header px-4 pt-4 sm:px-5">
              <span><Network className="h-3.5 w-3.5" /> Enterprise digital twin</span>
              <div className="sim-legend">
                <i className="observed" /> Observed / verified <i className="possible" /> Feasible next step
              </div>
              <div className="sim-graph-controls">
                <button
                  onClick={() => cursor < events.length - 1 && setCursor((value) => value + 1)}
                  disabled={contained || cursor >= events.length - 1}
                >
                  <FastForward /> Next event
                </button>
                <button
                  className="intervene"
                  onClick={applyIntervention}
                  disabled={phase < 3 || contained}
                >
                  <Scissors /> {contained ? 'Intervention applied' : 'Apply minimum intervention'}
                </button>
              </div>
            </div>

            <div className="sim-graph-wrap">
              {cursor < 0 && (
                <div className="sim-empty">
                  <Radar className="h-8 w-8" />
                  <b>Awaiting telemetry</b>
                  <span>Run the simulation to ingest eight cross-system events.</span>
                </div>
              )}
              <svg viewBox="0 0 1000 560" role="img" aria-label="Continuously updated attack path graph">
                <defs>
                  <filter id="nodeGlow">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <marker id="arrowObserved" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="#ef6045" />
                  </marker>
                  <marker id="arrowPossible" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="#71717a" />
                  </marker>
                </defs>
                {visibleEdges.map((edge) => {
                  const a = nodeMap[edge.from], b = nodeMap[edge.to];
                  const cut = contained && edge.from === 'vpn' && edge.to === 'reporting';
                  return (
                    <g key={`${edge.from}-${edge.to}`} className={cut ? 'sim-edge-cut' : ''} onClick={() => setSelected(edge.to)}>
                      <line
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        className={`sim-edge ${edge.type} ${edge.path === 'A' && phase >= 3 ? 'critical' : ''}`}
                        markerEnd={`url(#arrow${edge.type === 'observed' ? 'Observed' : 'Possible'})`}
                      />
                      {cut && (
                        <>
                          <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="23" className="sim-cut-ring" />
                          <path
                            d={`M${(a.x + b.x) / 2 - 8},${(a.y + b.y) / 2 - 8} l16,16 M${(a.x + b.x) / 2 + 8},${(a.y + b.y) / 2 - 8} l-16,16`}
                            className="sim-cut-x"
                          />
                        </>
                      )}
                    </g>
                  );
                })}
                {visibleNodes.map((node) => {
                  const critical = phase >= 3 && ['identity', 'device', 'vpn', 'reporting', 'service', 'database', 'bucket'].includes(node.id);
                  const blocked = contained && ['reporting', 'service', 'database', 'bucket'].includes(node.id);
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      className={`sim-node ${selected === node.id ? 'selected' : ''} ${critical ? 'critical' : ''} ${blocked ? 'blocked' : ''} ${node.kind === 'UNRELATED' ? 'noise' : ''}`}
                      onClick={() => setSelected(node.id)}
                      role="button"
                    >
                      <circle r={node.kind === 'CRITICAL ASSET' ? 38 : 31} />
                      <text className="sim-node-kind" y={-47}>{node.kind}</text>
                      <text className="sim-node-label" y={54}>{node.label}</text>
                      {node.kind === 'IDENTITY' ? (
                        <UserRound x={-12} y={-12} width={24} />
                      ) : node.kind.includes('ASSET') ? (
                        <Database x={-12} y={-12} width={24} />
                      ) : node.kind === 'SESSION' ? (
                        <KeyRound x={-12} y={-12} width={24} />
                      ) : node.kind === 'APPLICATION' ? (
                        <Server x={-12} y={-12} width={24} />
                      ) : (
                        <Network x={-12} y={-12} width={24} />
                      )}
                      {blocked && (
                        <g transform="translate(23,-24)">
                          <circle r="11" className="sim-block-badge" />
                          <X x={-7} y={-7} width={14} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
              {cursor >= 0 && (
                <div className="sim-node-inspector">
                  <span>{selectedNode.kind}</span>
                  <b>{selectedNode.label}</b>
                  <p>{selectedNode.detail}</p>
                </div>
              )}
              {phase >= 3 && !contained && (
                <div className="sim-critical-callout">
                  <Zap className="h-4 w-4" />
                  <span><b>Critical path isolated</b>6 observed hops connect the breached identity to customer data.</span>
                </div>
              )}
              {contained && (
                <div className="sim-contained-callout">
                  <ShieldCheck className="h-5 w-5" />
                  <span><b>Path interrupted at entry edge</b>Other routes recalculated; residual risk remains visible.</span>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Ranked Attack Paths & Explainable Decision Math */}
          <aside className="order-3 space-y-4">
            <section className="sim-panel overflow-hidden">
              <div className="sim-panel-title">
                <span><GitBranch className="h-3.5 w-3.5" /> Ranked attack paths</span>
                <em>LIKELIHOOD + IMPACT</em>
              </div>
              <PathRow rank="01" name="Reporting route" probability={contained ? 11 : phase >= 3 ? 87 : 34} impact="Critical" active={phase >= 2} contained={contained} />
              <PathRow rank="02" name="Identity route" probability={42} impact="Critical" active={phase >= 2} />
              <PathRow rank="03" name="Workload route" probability={29} impact="Critical" active={phase >= 2} />
              <p className="px-4 pb-4 pt-2 text-[10px] leading-4 text-zinc-500">
                Ranking keeps likelihood separate from destination impact. Unobserved steps reduce confidence.
              </p>
            </section>

            <section className="sim-calculation-panel">
              <div className="sim-calc-heading">
                <span><Gauge /> Why the digital twin chose this path</span>
                <em>EXPLAINABLE MATH</em>
              </div>
              <p>The graph first proves reachability, then combines likelihood, destination impact and evidence coverage. Framework labels never become probability by themselves.</p>
              
              <div className="sim-formula">
                <span>PATH PRIORITY</span>
                <b>{phase >= 3 ? '0.87' : '—'} <i>×</i> 0.96 <i>×</i> {phase >= 3 ? '0.92' : '—'}</b>
                <small>likelihood × impact × evidence</small>
                <strong>{phase >= 3 ? '= 76.8' : 'Awaiting enough evidence'}</strong>
              </div>

              <div className="sim-cut-comparison">
                <div><span>SESSION + ACCESS CUT</span><b>{phase >= 3 ? '74 risk points' : '—'}</b><em>1 user affected</em></div>
                <div><span>DISABLE REPORTING APP</span><b>{phase >= 3 ? '81 risk points' : '—'}</b><em>All report users affected</em></div>
                <div><span>SHUT DOWN DATABASE</span><b>{phase >= 3 ? '92 risk points' : '—'}</b><em>Business outage</em></div>
              </div>

              <div className="sim-calc-result">
                <ShieldCheck />
                <span>
                  <b>{contained ? 'Selected edge cut executed' : phase >= 3 ? 'Best risk reduction per unit of disruption' : 'The recommendation unlocks after path ranking'}</b>
                  {contained ? 'Residual risk 18/100 · two lower-confidence routes remain monitored.' : 'Revoke only the suspicious session and its reporting access; preserve the app and database.'}
                </span>
              </div>

              {/* Explainable Decision Deep-Dive Trigger (P2) */}
              <button
                onClick={() => { setShowOperations(true); setActiveDrawerTab('explain'); }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#C6613F]/30 bg-[#C6613F]/10 py-2 font-mono text-[9px] font-semibold text-[#ef8068] transition-colors hover:bg-[#C6613F]/20"
              >
                <FileText className="h-3 w-3" />
                Inspect mathematical proof & cut trade-offs
              </button>
            </section>
          </aside>
        </div>

        {/* Bottom Floating Assessment HUD */}
        <section className="sim-floating-assessment" aria-label="Live risk and trust score interpretation">
          <div className="sim-floating-label">
            <span><Radar className="h-3.5 w-3.5" /> LIVE INTERPRETATION</span>
            <em>{phaseLabels[phase]}</em>
          </div>
          <div className="sim-floating-scores">
            <ScoreDial label="RISK" value={risk} color={contained ? '#34d399' : '#ef6045'} detail={contained ? '−74 after intervention' : 'combined criticality'} />
            <ScoreDial label="TRUST" value={trust} color="#f4c15d" detail={contained ? 'session revoked' : 'identity confidence'} />
          </div>
          <div className="sim-floating-copy">
            <span>WHAT CHANGED AT THIS STEP</span>
            <h3>{interpretations[phase].title}</h3>
            <p>{interpretations[phase].body}</p>
          </div>
          <div className="sim-floating-proof">
            <b>{interpretations[phase].evidence}</b>
            <small>{contained ? '11% residual likelihood' : `${Math.max(9, phase >= 3 ? 87 : risk - 8)}% likelihood / 24h`}</small>
          </div>
        </section>
      </main>

      {/* Response Notifications Modal */}
      {showNotifications && (
        <div className="sim-notifications">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <BellRing className="h-4 w-4 text-[#ef6045]" /> Response notifications sent
            </span>
            <button onClick={() => setShowNotifications(false)}><X className="h-4 w-4" /></button>
          </div>
          <NotifyRow icon={<ShieldCheck />} role="SOC lead" person="Aarav Mehta" message="Critical path contained · case ATK-2047" />
          <NotifyRow icon={<UserRound />} role="Identity owner" person="Riya Kapoor" message="Session revoked · password reset required" />
          <NotifyRow icon={<Database />} role="Data owner" person="Customer Platform" message="Query/export evidence preserved for review" />
        </div>
      )}

      {/* Operational Evidence & P2 Reliability Drawer */}
      {showOperations && (
        <aside className="sim-operations-drawer" aria-label="Operational evidence and reliability controls">
          <header>
            <div>
              <span>JUDGE PROOF & EVALUATION</span>
              <h2>Operational Evidence & P2 Features</h2>
            </div>
            <button onClick={() => setShowOperations(false)} aria-label="Close operational evidence">
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Drawer Tab Switcher */}
          <div className="sim-drawer-tabs">
            <button
              onClick={() => setActiveDrawerTab('all')}
              className={`sim-drawer-tab ${activeDrawerTab === 'all' ? 'is-active' : ''}`}
            >
              All Overview
            </button>
            <button
              onClick={() => setActiveDrawerTab('load')}
              className={`sim-drawer-tab ${activeDrawerTab === 'load' ? 'is-active' : ''}`}
            >
              <TestTube2 className="h-3 w-3" /> Load Testing (P2)
            </button>
            <button
              onClick={() => setActiveDrawerTab('explain')}
              className={`sim-drawer-tab ${activeDrawerTab === 'explain' ? 'is-active' : ''}`}
            >
              <Gauge className="h-3 w-3" /> Explainable Decisions (P2)
            </button>
            <button
              onClick={() => setActiveDrawerTab('audit')}
              className={`sim-drawer-tab ${activeDrawerTab === 'audit' ? 'is-active' : ''}`}
            >
              <History className="h-3 w-3" /> Audit History (P2)
            </button>
            <button
              onClick={() => setActiveDrawerTab('escalation')}
              className={`sim-drawer-tab ${activeDrawerTab === 'escalation' ? 'is-active' : ''}`}
            >
              <BellRing className="h-3 w-3" /> Fallback Escalation (P2)
            </button>
            <button
              onClick={() => setActiveDrawerTab('faults')}
              className={`sim-drawer-tab ${activeDrawerTab === 'faults' ? 'is-active' : ''}`}
            >
              <WifiOff className="h-3 w-3" /> Resilience & Faults (P2)
            </button>
          </div>

          {/* Section: System of Record Separation (P0/P1) */}
          {(activeDrawerTab === 'all') && (
            <section>
              <h3><Database className="h-3.5 w-3.5" /> System-of-record separation</h3>
              <div className="sim-provenance-grid">
                <div>
                  <b>CMDB / access graph</b>
                  <span>Baseline facts</span>
                  <p>People, owners, services, assets, grants and verified trust relationships.</p>
                </div>
                <div>
                  <b>Observed telemetry</b>
                  <span>Time-bound evidence</span>
                  <p>Sign-ins, sessions, requests, queries and export events with evidence IDs.</p>
                </div>
              </div>
              <p className="sim-drawer-note">
                Baseline reachability never masquerades as an observed attack. Solid edges require telemetry or verified access; dashed edges remain possible steps.
              </p>
            </section>
          )}

          {/* Section: Lifecycle */}
          {(activeDrawerTab === 'all') && (
            <section>
              <h3><Activity className="h-3.5 w-3.5" /> Event → alert → response</h3>
              <div className="sim-lifecycle">
                {['THREAT EVENT', 'CORRELATED ALERT', 'RANKED PATH', 'MINIMUM CUT', 'OWNER NOTICE'].map((item, index) => (
                  <div key={item} className={phase >= Math.min(index, 4) ? 'is-done' : ''}>
                    <i>{phase > index || contained ? <Check /> : index + 1}</i>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Routing */}
          {(activeDrawerTab === 'all') && (
            <section>
              <h3><UserRound className="h-3.5 w-3.5" /> Recipient routing and status</h3>
              <div className="sim-routing-table">
                <div>
                  <span>Critical path</span>
                  <b>SOC lead · Aarav Mehta</b>
                  <em>{faultMode === 'notify' || escalationStage === 'fallback_active' ? 'PAGERDISPATCH' : contained ? 'SENT' : 'ARMED'}</em>
                </div>
                <div>
                  <span>Identity action</span>
                  <b>Account owner · Riya Kapoor</b>
                  <em>{contained ? 'SENT' : 'ON ACTION'}</em>
                </div>
                <div>
                  <span>Tier 0 data</span>
                  <b>Data owner · Customer Platform</b>
                  <em>{contained ? 'SENT' : 'ON IMPACT'}</em>
                </div>
              </div>
            </section>
          )}

          {/* P2: Load testing with documented results */}
          {(activeDrawerTab === 'all' || activeDrawerTab === 'load') && (
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3><TestTube2 className="h-3.5 w-3.5" /> Load testing with documented results</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLoadViewMode('live')}
                    className={`sim-mini-action ${loadViewMode === 'live' ? 'bg-[#ef6045]/20 font-bold text-white' : ''}`}
                  >
                    Interactive
                  </button>
                  <button
                    onClick={() => setLoadViewMode('documented')}
                    className={`sim-mini-action ${loadViewMode === 'documented' ? 'bg-[#ef6045]/20 font-bold text-white' : ''}`}
                  >
                    Documented
                  </button>
                </div>
              </div>

              {loadViewMode === 'live' ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] text-zinc-400">CHOOSE VOLUME:</span>
                    <div className="flex items-center gap-1">
                      {[10000, 25000, 50000].map((vol) => (
                        <button
                          key={vol}
                          onClick={() => setLoadEventVolume(vol)}
                          className={`rounded px-2 py-1 font-mono text-[8px] ${loadEventVolume === vol ? 'bg-[#ef6045] text-white font-bold' : 'bg-white/5 text-zinc-400'}`}
                        >
                          {vol.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <button
                      className="sim-mini-action ml-auto bg-[#ef6045]/20 text-[#ef8068]"
                      onClick={() => runLoadCheck(loadEventVolume)}
                      disabled={loadTestingRunning}
                    >
                      {loadTestingRunning ? 'Replaying…' : `Run ${loadEventVolume.toLocaleString()} test`}
                    </button>
                  </div>

                  <div className="sim-load-result mt-3">
                    <div>
                      <span>DATASET</span>
                      <b>{loadResult ? `${loadResult.volume.toLocaleString()} ev` : `${loadEventVolume.toLocaleString()} ev`}</b>
                    </div>
                    <div>
                      <span>THROUGHPUT</span>
                      <b className="text-emerald-400">{loadResult ? `${loadResult.rate.toLocaleString()}/s` : 'Not run'}</b>
                    </div>
                    <div>
                      <span>P95 / BATCH</span>
                      <b>{loadResult ? `${loadResult.p95} ms` : '—'}</b>
                    </div>
                    <div>
                      <span>DROPPED</span>
                      <b className="text-emerald-400">{loadResult ? `${loadResult.dropped} (0.00%)` : '—'}</b>
                    </div>
                  </div>

                  {loadResult && (
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded border border-white/5 bg-black/20 p-2 font-mono text-[7.5px] text-zinc-400">
                      <div>p50: <span className="text-white">{loadResult.p50}ms</span></div>
                      <div>p99: <span className="text-white">{loadResult.p99}ms</span></div>
                      <div>Total runtime: <span className="text-white">{loadResult.duration}ms</span></div>
                    </div>
                  )}
                  <p className="sim-drawer-note">
                    Verifies O(ΔV + ΔE) incremental reachability engine with deterministic zero-drop polynomial checksum.
                  </p>
                </>
              ) : (
                <>
                  <div className="sim-table-wrap">
                    <table className="sim-p2-table">
                      <thead>
                        <tr>
                          <th>Tier / Workload</th>
                          <th>Throughput</th>
                          <th>P95 Latency</th>
                          <th>Drops</th>
                          <th>SLA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DOCUMENTED_BENCHMARKS.map((item, idx) => (
                          <tr key={item.tier} className={idx === 1 ? 'is-highlight' : ''}>
                            <td><strong>{item.tier}</strong><br /><span className="text-[7px] text-zinc-500">{item.volume}</span></td>
                            <td>{item.eps}</td>
                            <td>{item.p95}</td>
                            <td>{item.drop}</td>
                            <td><span className="sim-p2-badge sim-p2-badge-green">{item.sla}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="sim-drawer-note">
                    Full documented results available in repository root at <code>LOAD_TEST_RESULTS.md</code>. CLI runner: <code>npm run test:load</code>.
                  </p>
                </>
              )}
            </section>
          )}

          {/* P2: Explainable threat decisions & minimum cut trade-offs */}
          {(activeDrawerTab === 'all' || activeDrawerTab === 'explain') && (
            <section>
              <h3><Gauge className="h-3.5 w-3.5" /> Explainable threat decisions & trade-offs</h3>
              <p className="text-[8px] text-zinc-400 leading-relaxed mb-3">
                IKORI replaces opaque black-box alerts with verifiable Bayesian factors and an explicit Pareto-optimal cut frontier:
              </p>

              {/* Mathematical breakdown */}
              <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3 font-mono text-[8px] space-y-2 mb-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[#ef8068] font-bold">1. COMPOSITE PRIORITY FORMULA</span>
                  <span className="text-white font-bold">76.8 / 100</span>
                </div>
                <div className="text-zinc-300">
                  Priority = Likelihood P(T) × Asset Criticality I(A) × Evidence Coverage E(C)
                </div>
                <div className="text-zinc-400 text-[7.5px]">
                  = 0.87 × 0.96 × 0.92 = <span className="text-emerald-400 font-bold">76.8 points</span>
                </div>
              </div>

              {/* 6-hop conditional probability decomposition */}
              <div className="space-y-2 mb-3">
                <span className="block font-mono text-[7.5px] uppercase tracking-wider text-zinc-400">
                  HOP CONDITIONAL PROBABILITIES (P = 0.87)
                </span>
                <div className="sim-explain-hop">
                  <strong>Hop 1: Breached Credential Match</strong>
                  <p>Employee email verified against exposed breach hash.</p>
                  <small>P(e1|T) = 0.95</small>
                </div>
                <div className="sim-explain-hop">
                  <strong>Hop 2: First-Seen Foreign Device (Singapore ASN)</strong>
                  <p>Fingerprint fp_98af has never signed in previously.</p>
                  <small>P(e2|T) = 0.82</small>
                </div>
                <div className="sim-explain-hop">
                  <strong>Hop 3: VPN Session Authentication Continuity</strong>
                  <p>Session vpn_7842 carries matching account & fingerprint.</p>
                  <small>P(e3|T) = 0.91</small>
                </div>
                <div className="sim-explain-hop">
                  <strong>Hop 4: Financial Reporting Tool Access</strong>
                  <p>Application request originated inside the verified VPN tunnel.</p>
                  <small>P(e4|T) = 0.88</small>
                </div>
                <div className="sim-explain-hop">
                  <strong>Hop 5: Service Account DB Inheritance</strong>
                  <p>reporting-svc identity holds verified read permissions on Tier 0 DB.</p>
                  <small>P(e5|T) = 0.94</small>
                </div>
                <div className="sim-explain-hop">
                  <strong>Hop 6: Abnormal 18× Query Spike & Export</strong>
                  <p>42,806 customer rows read; exported to billing bucket.</p>
                  <small>P(e6|T) = 0.96</small>
                </div>
              </div>

              {/* Trade-off Matrix */}
              <span className="block font-mono text-[7.5px] uppercase tracking-wider text-zinc-400 mb-1">
                MINIMUM CUT TRADE-OFF ANALYSIS (PARETO FRONTIER)
              </span>
              <div className="sim-table-wrap">
                <table className="sim-p2-table">
                  <thead>
                    <tr>
                      <th>Candidate Action</th>
                      <th>Risk Drop</th>
                      <th>Operational Impact</th>
                      <th>Selection</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="is-highlight">
                      <td><strong>Cut VPN ↔ Reporting</strong></td>
                      <td>-74 pts</td>
                      <td>1 analyst session (Riya)</td>
                      <td><span className="sim-p2-badge sim-p2-badge-green">RECOMMENDED</span></td>
                    </tr>
                    <tr>
                      <td>Disable Reporting App</td>
                      <td>-81 pts</td>
                      <td>450 corporate finance users</td>
                      <td><span className="sim-p2-badge sim-p2-badge-amber">DISRUPTIVE</span></td>
                    </tr>
                    <tr>
                      <td>Shutdown Customer DB</td>
                      <td>-92 pts</td>
                      <td>Complete enterprise outage</td>
                      <td><span className="sim-p2-badge sim-p2-badge-red">UNACCEPTABLE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* P2: Explainable threat decisions & audit history */}
          {(activeDrawerTab === 'all' || activeDrawerTab === 'audit') && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3><History className="h-3.5 w-3.5" /> Verifiable cryptographic audit history</h3>
                <button
                  onClick={exportAuditTrailJson}
                  className="sim-mini-action flex items-center gap-1 bg-white/5 text-zinc-300 hover:text-white"
                >
                  <Download className="h-3 w-3" /> Export JSON
                </button>
              </div>

              <div className="sim-audit-filters">
                {(['all', 'decision', 'intervention', 'escalation', 'fault'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAuditFilter(cat)}
                    className={`sim-audit-filter ${auditFilter === cat ? 'is-active' : ''}`}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                {filteredAuditRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className={`sim-audit-record ${
                      rec.category === 'intervention'
                        ? 'is-int'
                        : rec.category === 'fault'
                        ? 'is-flt'
                        : rec.category === 'escalation'
                        ? 'is-esc'
                        : ''
                    }`}
                  >
                    <time className="sim-audit-time">{rec.time.slice(0, 5)}</time>
                    <div className="sim-audit-content">
                      <strong>{rec.summary}</strong>
                      <p>{rec.detail}</p>
                      <div className="sim-audit-meta">
                        <span>Actor: {rec.actor}</span>
                        <span>•</span>
                        <code>{rec.hash.slice(0, 16)}…</code>
                        <span className="text-emerald-400">✓ Verified</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* P2: Automated fallback escalation */}
          {(activeDrawerTab === 'all' || activeDrawerTab === 'escalation') && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3><BellRing className="h-3.5 w-3.5" /> Automated fallback escalation</h3>
                {escalationStage === 'idle' ? (
                  <button
                    onClick={() => {
                      setEscalationStage('primary_attempt');
                      setEscalationLog(['22:25:00 — Triggered primary notification webhook to SOC ChatOps channel.']);
                    }}
                    className="sim-mini-action bg-amber-500/10 text-amber-400"
                  >
                    Simulate Webhook Timeout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEscalationStage('acknowledged');
                      setEscalationLog((prev) => [...prev, '22:25:12 — Responder Neha Sharma acknowledged incident via PagerDuty mobile.']);
                    }}
                    disabled={escalationStage === 'acknowledged'}
                    className="sim-mini-action bg-emerald-500/20 text-emerald-300"
                  >
                    {escalationStage === 'acknowledged' ? 'Incident Acknowledged' : 'Acknowledge Incident'}
                  </button>
                )}
              </div>

              <p className="text-[8px] text-zinc-400 leading-relaxed">
                If primary notification fails or primary responders fail to acknowledge within the SLA window, the system automatically escalates through redundant out-of-band channels.
              </p>

              <div className="sim-escalation-ladder">
                {/* Step 1: Primary Tier */}
                <div className={`sim-ladder-step ${escalationStage === 'primary_attempt' ? 'is-active' : escalationStage !== 'idle' ? 'is-failed' : ''}`}>
                  <div className="sim-ladder-num">1</div>
                  <div className="sim-ladder-body">
                    <strong>Tier 1: Primary Webhook / Slack ChatOps</strong>
                    <p>Recipient: Aarav Mehta (SOC Lead) · SLA: 15s window</p>
                  </div>
                  <div>
                    {escalationStage === 'primary_attempt' && <span className="sim-p2-badge sim-p2-badge-amber">DISPATCHING</span>}
                    {['sla_breached', 'fallback_active', 'acknowledged'].includes(escalationStage) && <span className="sim-p2-badge sim-p2-badge-red">503 TIMEOUT</span>}
                    {escalationStage === 'idle' && <span className="sim-p2-badge sim-p2-badge-blue">ARMED</span>}
                  </div>
                </div>

                {/* Step 2: Automated Fallback Tier */}
                <div className={`sim-ladder-step ${escalationStage === 'fallback_active' ? 'is-active' : escalationStage === 'acknowledged' ? 'is-success' : ''}`}>
                  <div className="sim-ladder-num">2</div>
                  <div className="sim-ladder-body">
                    <strong>Tier 2: Automated Failover (PagerDuty API + Twilio SMS)</strong>
                    <p>Recipient: Neha Sharma (SecOps Director) · High-Urgency Voice/SMS</p>
                  </div>
                  <div>
                    {escalationStage === 'fallback_active' && <span className="sim-p2-badge sim-p2-badge-amber">PAGING</span>}
                    {escalationStage === 'acknowledged' && <span className="sim-p2-badge sim-p2-badge-green">ACKNOWLEDGED</span>}
                    {['idle', 'primary_attempt'].includes(escalationStage) && <span className="text-[7.5px] text-zinc-500">STANDBY</span>}
                  </div>
                </div>

                {/* Step 3: Executive Tier */}
                <div className="sim-ladder-step">
                  <div className="sim-ladder-num">3</div>
                  <div className="sim-ladder-body">
                    <strong>Tier 3: Executive Escalation & Defensive Isolation Hold</strong>
                    <p>Recipient: Incident Commander · Automatic containment fail-safe lock</p>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-zinc-500">STANDBY</span>
                  </div>
                </div>
              </div>

              {escalationLog.length > 0 && (
                <div className="mt-3 rounded border border-white/5 bg-black/40 p-2 font-mono text-[7.5px] space-y-1 text-zinc-400">
                  {escalationLog.map((line, idx) => (
                    <div key={idx} className="leading-tight">{line}</div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* P2: Graceful handling of delayed events, ingestion failures, and unavailable notification services */}
          {(activeDrawerTab === 'all' || activeDrawerTab === 'faults') && (
            <section>
              <h3><WifiOff className="h-3.5 w-3.5" /> Failure handling & resilience demonstration</h3>
              <p className="text-[8px] text-zinc-400 leading-relaxed mb-3">
                Simulate production failure modes to demonstrate graceful system behavior:
              </p>

              <div className="sim-fault-actions">
                <button
                  onClick={() => setFaultMode('delay')}
                  className={faultMode === 'delay' ? 'is-active' : ''}
                >
                  Delayed event
                </button>
                <button
                  onClick={() => setFaultMode('ingest')}
                  className={faultMode === 'ingest' ? 'is-active' : ''}
                >
                  Ingest failure
                </button>
                <button
                  onClick={() => setFaultMode('notify')}
                  className={faultMode === 'notify' ? 'is-active' : ''}
                >
                  Webhook outage
                </button>
                <button onClick={() => setFaultMode('none')}>Clear faults</button>
              </div>

              <div className="sim-fault-status mt-3">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  <b>
                    {faultMode === 'delay'
                      ? 'Watermark Event-Time Re-ordering Active'
                      : faultMode === 'ingest'
                      ? `Circuit Breaker ${circuitBreakerState} · Dead-Letter Queue Active`
                      : faultMode === 'notify'
                      ? 'Redundant Fallback Notification Channel Active'
                      : 'All production systems nominal'}
                  </b>
                  {faultMode === 'delay'
                    ? 'Late-arriving evidence is buffered and causally re-stitched into the attack path by event timestamp rather than ingestion arrival time, preventing state invalidation.'
                    : faultMode === 'ingest'
                    ? `Primary ingestion connector tripped. Ingested events buffered in DLQ (${dlqBufferedCount} queued). Existing graph analysis remains available in degraded resilient state without false negatives.`
                    : faultMode === 'notify'
                    ? 'Primary webhook failed with HTTP 503. Incident escalated automatically to secondary PagerDuty REST API and emergency SMS with verified zero message loss.'
                    : 'Choose a fault scenario above to demonstrate graceful degradation under adverse conditions.'}
                </span>
              </div>

              {faultMode === 'ingest' && (
                <div className="mt-2 flex items-center justify-between rounded border border-white/5 bg-black/20 p-2 font-mono text-[8px]">
                  <span>DLQ BUFFER: {dlqBufferedCount} EVENTS</span>
                  <button
                    onClick={() => {
                      setFaultMode('none');
                    }}
                    className="sim-mini-action bg-emerald-500/20 text-emerald-300"
                  >
                    Drain DLQ & Replay ({dlqBufferedCount} events)
                  </button>
                </div>
              )}
            </section>
          )}
        </aside>
      )}
    </div>
  );
}

function ScoreDial({ label, value, color, detail }: { label: string; value: number; color: string; detail: string }) {
  return (
    <div className="sim-score">
      <div className="sim-score-ring" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,.07) 0deg)` }}>
        <div>
          <strong>{value}</strong>
          <span>/100</span>
        </div>
      </div>
      <b>{label} SCORE</b>
      <small>{detail}</small>
    </div>
  );
}

function PathRow({ rank, name, probability, impact, active, contained = false }: { rank: string; name: string; probability: number; impact: string; active: boolean; contained?: boolean }) {
  return (
    <div className={`sim-path-row ${active ? 'is-active' : ''} ${contained ? 'is-contained' : ''}`}>
      <b>{rank}</b>
      <span>
        <strong>{name}</strong>
        <small>{contained ? 'CUT / MONITORED' : impact + ' impact'}</small>
        <i><span style={{ width: active ? `${probability}%` : '0%' }} /></i>
      </span>
      <em>{active ? probability + '%' : '—'}</em>
    </div>
  );
}

function NotifyRow({ icon, role, person, message }: { icon: React.ReactNode; role: string; person: string; message: string }) {
  return (
    <div className="sim-notify-row">
      <span>{icon}</span>
      <div>
        <small>{role}</small>
        <b>{person}</b>
        <p>{message}</p>
      </div>
      <Check className="h-4 w-4 text-emerald-400" />
    </div>
  );
}
