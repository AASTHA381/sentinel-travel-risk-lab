from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class Decision(StrEnum):
    APPROVE = "approve"
    REVIEW = "review"
    BLOCK = "block"


class BookingAssessmentRequest(BaseModel):
    booking_id: str = Field(min_length=3, max_length=64)
    agent_id: str = Field(min_length=3, max_length=64)
    account_age_days: int = Field(ge=0, le=20_000)
    total_bookings_90d: int = Field(ge=0, le=100_000)
    chargebacks_90d: int = Field(ge=0, le=100_000)
    cancellations_90d: int = Field(ge=0, le=100_000)
    bookings_24h: int = Field(ge=0, le=10_000)
    recent_holds_24h: int = Field(ge=0, le=10_000)
    recent_late_cancellations_90d: int = Field(ge=0, le=10_000)
    seats_requested: int = Field(ge=1, le=250)
    hours_until_departure: float = Field(ge=0, le=8_760)
    ip_country: str = Field(pattern=r"^[A-Z]{2}$")
    card_country: str = Field(pattern=r"^[A-Z]{2}$")
    payment_attempts_10m: int = Field(ge=1, le=1_000)
    device_linked_to_fraud: bool = False
    card_on_blocklist: bool = False
    interaction_duration_seconds: float = Field(ge=0, le=7_200)
    fields_pasted: int = Field(ge=0, le=100)
    pointer_events: int = Field(ge=0, le=100_000)

    @model_validator(mode="after")
    def validate_history_counts(self) -> "BookingAssessmentRequest":
        if self.chargebacks_90d > self.total_bookings_90d:
            raise ValueError("chargebacks_90d cannot exceed total_bookings_90d")
        if self.cancellations_90d > self.total_bookings_90d:
            raise ValueError("cancellations_90d cannot exceed total_bookings_90d")
        return self


class RiskReason(BaseModel):
    code: str
    label: str
    contribution: float
    source: str


class ComponentScore(BaseModel):
    score: float = Field(ge=0, le=1)
    reasons: list[RiskReason]


class BookingAssessmentResponse(BaseModel):
    booking_id: str
    decision: Decision
    overall_score: float = Field(ge=0, le=1)
    payment_fraud: ComponentScore
    inventory_abuse: ComponentScore
    bot_likelihood: ComponentScore
    engine_mode: str
    policy_version: str
    summary: str


class AnalystBriefRequest(BaseModel):
    assessment: BookingAssessmentResponse


class AnalystBriefResponse(BaseModel):
    provider: str
    text: str
    data_disclosure: str
