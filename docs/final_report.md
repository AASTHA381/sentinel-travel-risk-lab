# Explainable AI for Travel Booking Fraud and Inventory Abuse

## Abstract

This project implements Sentinel, a full-stack research prototype that screens travel-agent bookings for payment fraud and inventory abuse. The system combines two XGBoost classifiers, transparent policy rules, interaction telemetry, relationship analysis, and an analyst-facing explanation layer. It returns separate component scores and recommends approve, manual review, or block. A React workbench allows assessors to test bookings, inspect evidence, explore linked entities, and view measured model performance.

No legal real-world booking dataset was supplied. Therefore, the implementation uses a reproducible 15,000-row synthetic dataset and labels every synthetic result clearly. The evaluation demonstrates software correctness and model behavior on generated patterns, not production effectiveness.

## Problem Definition

The project separates two outcomes that should not share one ambiguous fraud label:

1. **Payment fraud:** a booking later associated with a confirmed fraudulent payment outcome.
2. **Inventory abuse:** a booking or hold pattern associated with abusive inventory blocking and late cancellation.

The unit of prediction is one booking assessment. The output supports an analyst; it is not proof of intent or guilt.

## Research Questions

- Can transaction, agent-history, and telemetry features support separate explainable risk estimates?
- Can a hybrid policy expose clear reasons while preserving learned nonlinear patterns?
- Can analysts inspect linked entities without making a graph database mandatory for the demonstration?
- Can evaluation avoid misleading accuracy claims under class imbalance?

## System Design

### Gatekeeper

The FastAPI service validates all values and derives rates and mismatch indicators. Two XGBoost models process the same controlled numeric feature set. Policy rules provide auditable guardrails for known signals such as a blocklisted token. The returned component score is the larger of the model score and configured rule score; it should therefore be interpreted as a hybrid risk score, not a calibrated probability.

Policy thresholds in this prototype are `0.35` for review and `0.80` for block. They are demonstration policy choices, not empirically optimized business thresholds.

### Shop Assistant

The frontend can capture elapsed completion time, paste events, and pointer events. Live capture is opt-in and visible. Telemetry contributes to a separate bot-likelihood component and cannot independently establish payment fraud or inventory abuse.

### Detective

The API exposes an agent relationship graph. The default provider is a visibly labeled synthetic offline graph. If Neo4j environment variables and its official Python driver are available, the provider queries entities within two hops. Connection failure falls back to the demo provider rather than returning invented Neo4j results.

### Analyst Assistant

The base summary is deterministic and assembled from returned evidence. An optional Gemini action sends only component scores and evidence labels, excluding booking and agent IDs. The prompt prohibits unsupported inference. The response identifies `gemini`, `offline_deterministic`, or `offline_fallback` as its provider.

## Data And Features

The generator uses seed `20260823`. It creates 15,000 time-ordered rows containing account age, booking history, chargeback and cancellation rates, velocity, hold behavior, seats requested, departure lead time, country mismatch, payment attempts, device and blocklist signals, and interaction telemetry.

Labels are sampled from documented nonlinear synthetic risk functions plus noise. Because the labels are generated from these features, success only shows that the models can recover generated relationships.

No raw card numbers, names, email addresses, phone numbers, or precise IP addresses are used.

## Experimental Method

Rows are split chronologically:

| Split | Rows | Purpose |
|---|---:|---|
| Training | 10,554 | Initial fitting |
| Validation | 2,220 | Development period |
| Untouched test | 2,226 | Final reported metrics |

The final models are fitted on training plus validation rows. The newest 15% is evaluated once. The fixed classification threshold is `0.50`.

Metrics are precision, recall, PR-AUC, ROC-AUC, false-positive rate, and confusion matrices. Accuracy is not used as the headline because rare-event datasets can make a useless all-negative classifier appear accurate.

## Results

### Payment Fraud

| Metric | Result |
|---|---:|
| Precision | 0.7571 |
| Recall | 0.3706 |
| PR-AUC | 0.4858 |
| ROC-AUC | 0.7758 |
| False-positive rate | 0.0082 |

Confusion matrix: TN `2066`, FP `17`, FN `90`, TP `53`.

### Inventory Abuse

| Metric | Result |
|---|---:|
| Precision | 0.8229 |
| Recall | 0.6320 |
| PR-AUC | 0.6714 |
| ROC-AUC | 0.8443 |
| False-positive rate | 0.0172 |

Confusion matrix: TN `1942`, FP `34`, FN `92`, TP `158`.

### Interpretation

The payment model is precise when it predicts positive but misses 90 of 143 generated positive cases at threshold `0.50`. It must not be described as 98% accurate or production-ready. Inventory-abuse performance is stronger on this generated test period but remains synthetic.

## Explainability

The API uses XGBoost's native contribution output to return the strongest positive influences for each prediction. Rule and telemetry reasons are returned separately by source. These values explain model influence on its internal score; they do not prove causality.

## Verification

- Backend and model pipeline: 17 automated tests pass.
- Frontend UX and validation formatting: 5 automated tests pass.
- Frontend: TypeScript production build and Oxlint pass without warnings.
- Notebook: all cells execute headlessly; recomputed metrics and confusion matrices must equal saved metadata.
- Browser: assessment, offline brief, graph, and model views were exercised against live services.
- Responsive design: desktop and 390-pixel mobile checks show no horizontal overflow or overlapping controls.

## Bias, Privacy, And Governance

- Location mismatch and time-sensitive travel are weak contextual signals, not independent block reasons.
- Behavioral telemetry can disadvantage assistive technology and autofill users; it remains a separate review signal.
- Device and IP identifiers require purpose limitation, restricted access, retention limits, and deletion processes.
- Production feedback must include delayed chargebacks and randomly audited approvals to reduce selection bias.
- Analysts need decision logging, appeal paths, and authority to override automated recommendations.
- Subgroup testing must be defined with legal and domain experts; synthetic results cannot establish fairness.

## Limitations

- Synthetic labels simplify real fraud, concept drift, delayed outcomes, and adversarial adaptation.
- The policy thresholds are not cost-calibrated.
- The offline graph contains demonstration relationships only.
- Gemini and Neo4j require external configuration and were designed to fail transparently.
- The prototype lacks production authentication, authorization, encryption configuration, monitoring, and durable case storage.

## Future Validation Plan

1. Obtain lawful, de-identified historical booking outcomes and a feature dictionary.
2. Define labels with fraud operations and account for delayed chargebacks.
3. Split by time and group entities to prevent agent or device leakage.
4. Compare XGBoost with rule-only and simple logistic-regression baselines.
5. Calibrate probabilities and select thresholds using monetary and false-positive costs.
6. Run subgroup, drift, privacy, and security reviews.
7. Conduct a shadow deployment before any automated blocking.

## Conclusion

Sentinel demonstrates an end-to-end, explainable architecture for two distinct travel-booking risks. Its strongest academic contribution is not an exaggerated accuracy claim; it is a reproducible prototype that exposes data provenance, component scores, evidence sources, measured limitations, and optional integration status directly to the assessor.
