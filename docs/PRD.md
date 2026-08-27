# Product Requirements Document (PRD)
## Sentinel — Explainable Travel Booking Risk Assessment Platform

**Version:** 1.0  
**Status:** Research Prototype  
**Author:** AASTHA381  
**Last Updated:** August 2026  

---

## 1. Executive Summary

Sentinel is an AI-powered research prototype that screens travel-agent bookings for two distinct risk categories: **payment fraud** and **inventory abuse**. It combines machine learning predictions (XGBoost), transparent policy rules, real-time form interaction telemetry, entity relationship graph analysis, and an analyst-facing explanation layer to produce a recommended decision: **Approve**, **Manual Review**, or **Block**.

Sentinel is designed for use by fraud analysts and risk teams at online travel agencies (OTAs). It does not make autonomous production decisions; instead, it surfaces explainable evidence to support human-in-the-loop review.

---

## 2. Problem Statement

### 2.1 Business Problem
Travel booking platforms face two financially significant fraud vectors that are often conflated under a single "fraud" label, leading to poor model performance and unfair denials:

| Risk Type | Description | Business Impact |
|---|---|---|
| **Payment Fraud** | Bookings made using compromised payment tokens or stolen card credentials | Chargebacks, airline losses, reputational damage |
| **Inventory Abuse** | Bulk seat holds by agents followed by late cancellations, blocking genuine customers | Revenue loss, customer frustration, unfair market advantage |

### 2.2 Current Gaps
- Existing systems use a single undifferentiated "fraud score," making it impossible to explain decisions clearly
- Analysts lack tools to inspect entity relationships (agent → device → payment method) at review time
- Form interaction signals (paste events, fast completions) are not leveraged
- Black-box ML models create compliance and fairness risks

---

## 3. Goals & Non-Goals

### Goals
- Provide **separate, explainable risk scores** for payment fraud and inventory abuse
- Surface **evidence-backed reasoning** at each step of the risk assessment
- Enable analysts to **explore entity relationship graphs** without requiring a live database
- Support **optional Gemini AI analyst briefs** that exclude PII
- Demonstrate **measurable model performance** on a reproducible synthetic dataset

### Non-Goals
- Making autonomous real-time booking decisions in production
- Storing raw card numbers, names, or precise personal identifiers
- Replacing human analyst judgment
- Claiming performance metrics on real travel industry data

---

## 4. Target Users

| User | Role | Primary Need |
|---|---|---|
| **Fraud Analyst** | Reviews flagged bookings | Understand why a booking was flagged; see evidence |
| **Risk Manager** | Sets policy thresholds | Configure and audit policy rules |
| **ML Engineer** | Maintains and retrains models | Access evaluation metrics and model artifacts |
| **Product Manager / Compliance** | Oversees system fairness | Ensure explainability, audit trails, and limitations are visible |

---

## 5. Core Features

### 5.1 Gatekeeper (Risk Scoring Engine)

**Description:** The core prediction service that scores each booking across two risk dimensions.

| Feature | Detail |
|---|---|
| **Payment Fraud Model** | XGBoost classifier trained on 10,554 rows; PR-AUC 0.4858, FPR 0.0082 |
| **Inventory Abuse Model** | XGBoost classifier; PR-AUC 0.6714, FPR 0.0172 |
| **Policy Rules** | Auditable guardrails (e.g., blocklisted tokens trigger deterministic rules) |
| **Hybrid Score** | `max(model_score, rule_score)` — conservative by design |
| **Decision Thresholds** | Review ≥ 0.35 · Block ≥ 0.80 |
| **API** | FastAPI service at `POST /assess` returning component scores + decision + evidence |

**Acceptance Criteria:**
- [ ] Returns a decision in < 500ms for a single booking
- [ ] All returned scores are between 0 and 1
- [ ] Policy rule violations always override model score with documented label
- [ ] API returns 422 for invalid input payloads

---

### 5.2 Shop Assistant (Interaction Telemetry)

**Description:** Optional capture of behavioral signals from the booking form to detect bot-like behavior.

| Signal | What it Detects |
|---|---|
| Elapsed completion time | Unusually fast form fills |
| Paste event count | Automated credential injection |
| Pointer event count | Lack of human mouse/touch interaction |

**Acceptance Criteria:**
- [ ] Telemetry is opt-in and visibly disclosed to the user
- [ ] Telemetry signals contribute only to bot-likelihood score; cannot independently prove fraud
- [ ] Missing telemetry gracefully defaults to neutral score

---

### 5.3 Detective (Entity Relationship Graph)

**Description:** Interactive graph visualization showing relationships between agents, devices, payment tokens, and IP addresses.

| Mode | Behavior |
|---|---|
| **Offline Demo** | Uses a visibly labeled synthetic dataset included in the repository |
| **Neo4j Live** | Queries entities up to 2 hops from the assessed booking; requires env vars |
| **Fallback** | If Neo4j connection fails, falls back to offline demo — never returns invented results |

**Acceptance Criteria:**
- [ ] Graph clearly labels whether data is `offline_demo` or `live`
- [ ] Offline graph loads with no external dependencies
- [ ] Neo4j fallback never silently fails — always shows provider label

---

### 5.4 Analyst Assistant (AI Brief)

**Description:** Generates a human-readable summary of assessment evidence for the reviewing analyst.

| Mode | Provider Label | Behavior |
|---|---|---|
| **Local Deterministic** | `offline_deterministic` | Rule-based summary assembled from returned evidence fields |
| **Gemini AI** | `gemini` | Sends only scores + evidence labels (no booking/agent IDs) to Gemini API |
| **Offline Fallback** | `offline_fallback` | Used when Gemini is configured but unavailable |

**Acceptance Criteria:**
- [ ] Brief always identifies its provider
- [ ] Gemini prompt explicitly prohibits unsupported inferences
- [ ] No PII (booking ID, agent ID, card numbers) is sent to Gemini
- [ ] Brief is generated in < 3 seconds

---

### 5.5 Human Review Queue

**Description:** Session-level case queue that stores completed assessments for analyst review.

**Acceptance Criteria:**
- [ ] Queue persists across tab navigation within a session
- [ ] Each case shows booking ID, decision, timestamp, and risk scores
- [ ] Analysts can open any queued case to view full evidence

---

### 5.6 Evaluation Dashboard

**Description:** Displays measured model performance metrics on the synthetic holdout set.

| Metric | Payment Fraud | Inventory Abuse |
|---|---:|---:|
| Precision | 0.7571 | 0.8229 |
| Recall | 0.3706 | 0.6320 |
| PR-AUC | 0.4858 | 0.6714 |
| False-Positive Rate | 0.0082 | 0.0172 |

**Acceptance Criteria:**
- [ ] Metrics are loaded from `backend/artifacts/metadata.json`
- [ ] Dashboard includes a visible disclaimer that metrics are on synthetic data only
- [ ] Confusion matrix is displayed for both models

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Analyst Workbench                  │
│   Assessment · Cases · Model Metrics · Network Graph         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────────────┐
│                     FastAPI Backend                          │
│  POST /assess  ·  GET /graph  ·  POST /brief  ·  GET /eval  │
└────┬──────────────┬──────────────┬────────────┬─────────────┘
     │              │              │            │
 XGBoost        Policy         Neo4j/      Gemini /
 Models         Rules          Offline     Offline
 (Payment +     Engine         Graph       Brief
  Inventory)
```

### Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Python 3.11+ · FastAPI · Uvicorn |
| ML | XGBoost · scikit-learn · SHAP |
| Optional | Gemini API (`google-genai`) · Neo4j |
| Data | 15,000-row reproducible synthetic dataset (seed `20260823`) |

---

## 7. Data & Privacy Requirements

| Requirement | Detail |
|---|---|
| **No raw card numbers** | Only payment provider tokens are used |
| **No PII in ML features** | No names, emails, phone numbers, or precise IPs |
| **No PII to Gemini** | Only scores and evidence labels are transmitted |
| **Synthetic data only** | All included data is reproducibly generated |
| **Audit labels** | Every data source (offline/live) is visibly labeled in the UI |

---

## 8. Limitations & Safety Notices

> ⚠️ **This is a research prototype. It must not be used for production decisions without:**

- Lawful outcome data from real bookings
- Leakage analysis and temporal validation
- Model calibration and fairness/subgroup testing
- Outcome monitoring and drift detection
- Human appeal process for blocked bookings
- Access control, retention rules, and legal review

- Geography, time of day, or telemetry alone must **never** independently prove fraud
- SHAP values explain model influence — **not causation or guilt**
- The payment fraud model misses ~63% of generated fraud cases at threshold 0.50 — this limitation is intentionally surfaced in the UI

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| API response time (p95) | < 500ms |
| Frontend first load | < 3s |
| Analyst brief generation | < 3s |
| False-positive rate (payment) | < 1% on synthetic holdout |
| False-positive rate (inventory) | < 2% on synthetic holdout |
| Unit test coverage | Backend pytest + Frontend Vitest passing |

---

## 10. Out of Scope (v1.0)

- Real-time streaming ingestion
- Multi-tenant support
- RBAC / IAM integration
- Production deployment pipeline
- Model retraining automation
- Mobile-native app

---

## 11. References

- [README.md](../README.md) — Setup and run instructions
- [docs/architecture.md](architecture.md) — Full system architecture and sequence diagrams
- [docs/final_report.md](final_report.md) — Implementation and evaluation report
- [docs/presentation.md](presentation.md) — Slide-ready presentation
- [TESTS.md](../TESTS.md) — Test dossier with screenshot evidence
- [notebooks/model_evaluation.executed.ipynb](../notebooks/model_evaluation.executed.ipynb) — Executed evaluation notebook
