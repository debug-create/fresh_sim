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
npm run lint
npm test
npm run build
```

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
