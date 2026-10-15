# IKORI Judging Round Guide

## Run the frontend

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/complete-simulation`.

## Recommended demonstration flow

1. Select **Complete Simulation** in the navigation.
2. Explain that gray graph relationships come from the CMDB and verified access model. Orange relationships are supported by observed telemetry. Dashed relationships are feasible next steps, not claims that an event happened.
3. Press **Run simulation** for an automatic replay, or use **Next event** in the Enterprise Digital Twin toolbar for a controlled walkthrough.
4. Point out the unrelated web-bot and HR-link events. They remain visible but disconnected because their identities, devices and sessions do not match the attack story.
5. Watch the fixed Risk and Trust HUD change as evidence accumulates.
6. At Rank and Isolate, compare the horizontal attack-path bars and open the calculation panel below them.
7. Explain the illustrative priority calculation: likelihood multiplied by asset impact and evidence coverage. These inputs remain visible separately.
8. Select **Apply minimum intervention** after it unlocks. The session and reporting-access edge is cut while the application and database stay online.
9. Show the recalculated residual risk and the notifications sent to the SOC lead, identity owner and data owner.
10. Open **Evidence and reliability** to demonstrate provenance separation, alert lifecycle, recipient routing, audit history, replay testing and failure fallbacks.

## Problem statement coverage

- Heterogeneous events become a normalized chronological stream.
- Identities, devices, sessions, applications, service accounts and data assets are correlated in one graph.
- Multiple possible attack paths are continuously compiled.
- Likelihood and business impact remain separate and explainable.
- The highest-priority path is isolated with its supporting evidence.
- Candidate interventions are compared by risk reduction and operational disruption.
- The smallest effective graph cut is simulated before execution.
- Residual paths remain visible after containment.
- Correct owners receive status-specific notifications.
- Delayed events, ingestion failures and notification outages have demonstrable fallback behavior.

## Verification commands

```bash
npm run lint         # TypeScript typecheck
npm test             # Automated unit tests (including load test SLA assertions)
npm run test:load    # Standalone high-throughput load benchmark runner
npm run build        # Production bundle build
npm run deploy:check # Full deployment pipeline check (lint + test + build)
```

## P2 Brownie Points Feature Verification

Judges can verify all four P2 deliverables directly in the UI or via CLI:

1. **Load testing with documented results:**
   - **CLI:** Run `npm run test:load` for the benchmark report verifying >2,000,000 eps throughput, p95 < 50ms, and 0 dropped events.
   - **Documentation:** View `LOAD_TEST_RESULTS.md` documenting Tier 1 (Baseline 5k), Tier 2 (Peak 25k), Tier 3 (Stress 50k), and Tier 4 (Soak 1M).
   - **UI:** In the simulation, open **Evidence & reliability** → **Load Testing (P2)**. Switch between interactive in-browser replay (10k/25k/50k events) and documented benchmark tables.

2. **Explainable threat decisions and audit history:**
   - **Explainable Math:** In the calculation panel, click **Inspect mathematical proof & cut trade-offs** to see the 6-hop conditional probability decomposition ($0.87 \times 0.96 \times 0.92 = 76.8$) and the Pareto frontier trade-off table comparing the 3 candidate cuts.
   - **Cryptographic Audit Log:** Open **Audit History (P2)** tab to inspect real-time SHA-256 chained audit entries filterable by category (`DECISION`, `INTERVENTION`, `ESCALATION`, `FAULT`). Click **Export JSON** to download the verified audit trail fixture.

3. **Automated fallback escalation:**
   - Open **Fallback Escalation (P2)** in the drawer.
   - Click **Simulate Webhook Timeout** to trigger a simulated 503 outage on Tier 1 (SOC ChatOps).
   - Watch the automated failover rule engage Tier 2 (PagerDuty REST v2 API + emergency Twilio SMS to On-Call SecOps Director Neha Sharma).
   - Click **Acknowledge Incident** to resolve the alert.

4. **Graceful handling of delayed events, ingestion failures, and unavailable notification services:**
   - Open **Resilience & Faults (P2)** in the drawer:
     - **Delayed Event:** Ingests out-of-order proxy event (`22:08`) and re-orders it into the active DAG using a watermarking buffer without resetting existing progress.
     - **Ingest Failure:** Trips the ingestion connector Circuit Breaker to `OPEN`. Buffers incoming telemetry into the Dead-Letter Queue (DLQ) with exponential backoff while preserving analysis on the last validated snapshot. Click **Drain DLQ & Replay** to recover.
     - **Webhook Outage:** Disables primary webhook and automatically reroutes to redundant secondary PagerDuty API with zero alert loss.

## Push to a new GitHub repository

Create an empty repository on GitHub, then run these commands from this folder:

```bash
git init -b main
git add .
git commit -m "Prepare IKORI judging frontend"
git remote add origin YOUR_NEW_REPOSITORY_URL
git push -u origin main
```

Do not commit a real `.env` file. The included `.env.example` documents the expected shape without secrets.
