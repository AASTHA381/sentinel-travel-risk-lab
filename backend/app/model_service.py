from dataclasses import dataclass
from pathlib import Path

import joblib
from sklearn.ensemble import GradientBoostingClassifier

from app.features import FEATURE_LABELS, booking_feature_frame
from app.schemas import BookingAssessmentRequest


ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts"


@dataclass(frozen=True)
class ModelReason:
    code: str
    label: str
    contribution: float


@dataclass(frozen=True)
class ModelPrediction:
    score: float
    reasons: list[ModelReason]


class ModelStore:
    def __init__(self) -> None:
        self._payment: GradientBoostingClassifier | None = None
        self._inventory: GradientBoostingClassifier | None = None

    @property
    def available(self) -> bool:
        return all(
            path.exists()
            for path in (
                ARTIFACT_DIR / "payment_fraud_model.joblib",
                ARTIFACT_DIR / "inventory_abuse_model.joblib",
            )
        )

    @property
    def mode(self) -> str:
        return "hybrid_gradient_boosting_rules" if self.available else "rules_only_untrained"

    def _load(self) -> None:
        if not self.available:
            return
        if self._payment is None:
            self._payment = joblib.load(ARTIFACT_DIR / "payment_fraud_model.joblib")
        if self._inventory is None:
            self._inventory = joblib.load(ARTIFACT_DIR / "inventory_abuse_model.joblib")

    def predict(self, booking: BookingAssessmentRequest) -> tuple[ModelPrediction, ModelPrediction] | None:
        self._load()
        if self._payment is None or self._inventory is None:
            return None
        frame = booking_feature_frame(booking)
        return self._predict_one(self._payment, frame), self._predict_one(self._inventory, frame)

    @staticmethod
    def _predict_one(model: GradientBoostingClassifier, frame) -> ModelPrediction:
        score = float(model.predict_proba(frame)[0, 1])
        # Approximate per-instance evidence: global feature importance weighted by this
        # booking's (non-negative) feature value. Not a true Shapley decomposition.
        values = frame.iloc[0]
        weighted = [
            (feature, float(importance) * float(values[feature]))
            for feature, importance in zip(frame.columns, model.feature_importances_, strict=True)
            if importance > 0 and values[feature] > 0
        ]
        weighted.sort(key=lambda item: item[1], reverse=True)
        total = sum(value for _, value in weighted[:4]) or 1.0
        reasons = [
            ModelReason(
                code=f"model_{feature}",
                label=FEATURE_LABELS[feature],
                contribution=round(value / total, 3),
            )
            for feature, value in weighted[:4]
        ]
        return ModelPrediction(score=round(score, 3), reasons=reasons)


model_store = ModelStore()
