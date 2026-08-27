import json
import os

from app.schemas import AnalystBriefResponse, BookingAssessmentResponse


def _evidence_payload(assessment: BookingAssessmentResponse) -> dict:
    reasons = [
        *assessment.payment_fraud.reasons,
        *assessment.inventory_abuse.reasons,
        *assessment.bot_likelihood.reasons,
    ]
    return {
        "decision": assessment.decision.value,
        "overall_score": assessment.overall_score,
        "component_scores": {
            "payment_fraud": assessment.payment_fraud.score,
            "inventory_abuse": assessment.inventory_abuse.score,
            "bot_likelihood": assessment.bot_likelihood.score,
        },
        "verified_evidence_labels": [reason.label for reason in reasons[:8]],
    }


def generate_analyst_brief(assessment: BookingAssessmentResponse) -> AnalystBriefResponse:
    if not os.getenv("GEMINI_API_KEY"):
        return AnalystBriefResponse(
            provider="offline_deterministic",
            text=assessment.summary,
            data_disclosure="No external service used; summary is assembled from returned risk evidence.",
        )

    try:
        from google import genai

        client = genai.Client()
        interaction = client.interactions.create(
            model=os.getenv("GEMINI_MODEL", "gemini-3.7-flash"),
            store=False,
            system_instruction=(
                "You summarize travel risk evidence for a human analyst. Use only the supplied "
                "scores and evidence labels. Do not infer identity, intent, guilt, location, or facts "
                "that are not present. Write at most two plain-English sentences."
            ),
            input=json.dumps(_evidence_payload(assessment)),
            generation_config={"temperature": 0.1, "thinking_level": "low"},
        )
        text = interaction.output_text.strip()
        if not text:
            raise RuntimeError("Gemini returned an empty analyst brief")
        return AnalystBriefResponse(
            provider="gemini",
            text=text[:800],
            data_disclosure="Only scores and evidence labels were sent to Gemini; booking and agent IDs were excluded.",
        )
    except Exception:
        return AnalystBriefResponse(
            provider="offline_fallback",
            text=assessment.summary,
            data_disclosure="Gemini was configured but unavailable; no generated text is presented as successful.",
        )
