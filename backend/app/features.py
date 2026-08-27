from collections.abc import Mapping

import pandas as pd

from app.schemas import BookingAssessmentRequest


MODEL_FEATURES = [
    "account_age_days",
    "total_bookings_90d",
    "chargeback_rate_90d",
    "cancellation_rate_90d",
    "bookings_24h",
    "recent_holds_24h",
    "recent_late_cancellations_90d",
    "seats_requested",
    "hours_until_departure",
    "country_mismatch",
    "payment_attempts_10m",
    "device_linked_to_fraud",
    "card_on_blocklist",
    "interaction_duration_seconds",
    "fields_pasted",
    "pointer_events",
]


FEATURE_LABELS: Mapping[str, str] = {
    "account_age_days": "Agent account age",
    "total_bookings_90d": "Agent booking history",
    "chargeback_rate_90d": "Recent chargeback rate",
    "cancellation_rate_90d": "Recent cancellation rate",
    "bookings_24h": "Bookings created in 24 hours",
    "recent_holds_24h": "Recent inventory holds",
    "recent_late_cancellations_90d": "Recent late cancellations",
    "seats_requested": "Seats requested",
    "hours_until_departure": "Time until departure",
    "country_mismatch": "IP and card country mismatch",
    "payment_attempts_10m": "Payment-attempt velocity",
    "device_linked_to_fraud": "Device link to confirmed fraud",
    "card_on_blocklist": "Payment token blocklist match",
    "interaction_duration_seconds": "Form completion duration",
    "fields_pasted": "Pasted form fields",
    "pointer_events": "Pointer activity",
}


def booking_feature_frame(booking: BookingAssessmentRequest) -> pd.DataFrame:
    total = max(booking.total_bookings_90d, 1)
    row = {
        "account_age_days": booking.account_age_days,
        "total_bookings_90d": booking.total_bookings_90d,
        "chargeback_rate_90d": booking.chargebacks_90d / total,
        "cancellation_rate_90d": booking.cancellations_90d / total,
        "bookings_24h": booking.bookings_24h,
        "recent_holds_24h": booking.recent_holds_24h,
        "recent_late_cancellations_90d": booking.recent_late_cancellations_90d,
        "seats_requested": booking.seats_requested,
        "hours_until_departure": booking.hours_until_departure,
        "country_mismatch": int(booking.ip_country != booking.card_country),
        "payment_attempts_10m": booking.payment_attempts_10m,
        "device_linked_to_fraud": int(booking.device_linked_to_fraud),
        "card_on_blocklist": int(booking.card_on_blocklist),
        "interaction_duration_seconds": booking.interaction_duration_seconds,
        "fields_pasted": booking.fields_pasted,
        "pointer_events": booking.pointer_events,
    }
    return pd.DataFrame([row], columns=MODEL_FEATURES)
