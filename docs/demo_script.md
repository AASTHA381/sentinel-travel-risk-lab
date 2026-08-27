# Five-Minute Demo Script

## 0:00–0:40 — Scope

Open the Assessment view. State that Sentinel evaluates payment fraud and inventory abuse separately. Point to the permanent “Not for production decisions” notice.

## 0:40–1:20 — Trusted Scenario

Select **Trusted**, click **Assess booking**, and show the approve result. Explain that no configured rule fired and the model score remains below the review threshold.

## 1:20–2:20 — Payment-Risk Scenario

Select **Payment risk** and assess it. Show separate payment, inventory, and bot scores. Read two evidence sources: one policy rule and one XGBoost contribution. Clarify that evidence explains the recommendation but does not prove intent.

## 2:20–2:50 — Analyst Brief

Click **Generate analyst brief**. Point to the provider. Without an API key it reads `offline deterministic`; with a valid key it reads `gemini`. Read the privacy disclosure below it.

## 2:50–3:35 — Shop Assistant

Turn on **Live capture**, interact with several fields, and assess. Explain that elapsed time, paste count, and pointer events are captured visibly and contribute only to bot likelihood.

## 3:35–4:15 — Detective

Open **Detective graph**, select Device 77A, and show the two connected agents. Point to `offline_demo` and the synthetic watermark. Explain that configured Neo4j data replaces this provider.

## 4:15–5:00 — Model Evidence

Open **Model evidence**. Show the chronological split and the two metric panels. State the payment recall limitation and the synthetic-data disclosure. End by showing the executed notebook, which independently recomputes and verifies the saved metrics.

## Questions To Answer Honestly

- **Is this production ready?** No. It is a tested research prototype.
- **Why not report accuracy?** Rare-event accuracy can be high while detecting no fraud.
- **Why two models?** Payment fraud and inventory abuse have different outcomes and interventions.
- **Is Gemini making decisions?** No. It summarizes evidence after the decision engine responds.
- **Is Neo4j required?** No. The provider is optional, and the UI discloses the active source.
