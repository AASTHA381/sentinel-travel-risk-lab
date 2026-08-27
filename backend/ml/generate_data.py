from pathlib import Path

import numpy as np
import pandas as pd

from app.features import MODEL_FEATURES


SEED = 20260823
ROW_COUNT = 15_000
DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "synthetic_bookings.csv"


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-value))


def generate_synthetic_bookings(row_count: int = ROW_COUNT, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    payment_actor = rng.random(row_count) < 0.055
    inventory_actor = rng.random(row_count) < 0.075
    automated_actor = rng.random(row_count) < 0.10

    account_age = np.clip(rng.exponential(520, row_count), 0, 4_000).astype(int)
    account_age[payment_actor] = np.clip(rng.exponential(24, payment_actor.sum()), 0, 180).astype(int)
    total_bookings = np.clip(rng.poisson(12 + np.sqrt(account_age) * 3), 0, 2_000)

    chargeback_probability = np.where(payment_actor, 0.12, 0.004)
    cancellation_probability = np.where(inventory_actor, 0.48, 0.08)
    chargebacks = rng.binomial(total_bookings, chargeback_probability)
    cancellations = rng.binomial(total_bookings, cancellation_probability)

    bookings_24h = rng.poisson(np.where(inventory_actor | automated_actor, 38, 4))
    recent_holds = rng.poisson(np.where(inventory_actor, 19, 2))
    late_cancellations = rng.poisson(np.where(inventory_actor, 5, 0.25))
    seats = np.clip(rng.poisson(np.where(inventory_actor, 18, 2)) + 1, 1, 100)
    hours_until_departure = np.clip(
        rng.exponential(np.where(payment_actor, 14, 180)), 0.1, 2_000
    )
    country_mismatch = rng.random(row_count) < np.where(payment_actor, 0.62, 0.11)
    payment_attempts = np.clip(rng.poisson(np.where(payment_actor, 5.5, 0.5)) + 1, 1, 30)
    fraud_device = rng.random(row_count) < np.where(payment_actor, 0.48, 0.008)
    blocklisted_card = rng.random(row_count) < np.where(payment_actor, 0.24, 0.001)
    interaction_duration = np.clip(
        rng.normal(np.where(automated_actor, 5, 78), np.where(automated_actor, 2, 28)), 1, 300
    )
    fields_pasted = np.clip(rng.poisson(np.where(automated_actor, 7, 1)), 0, 20)
    pointer_events = np.clip(rng.poisson(np.where(automated_actor, 1, 35)), 0, 200)

    chargeback_rate = chargebacks / np.maximum(total_bookings, 1)
    cancellation_rate = cancellations / np.maximum(total_bookings, 1)

    payment_logit = (
        -4.2
        + 1.1 * country_mismatch
        + 1.7 * fraud_device
        + 2.8 * blocklisted_card
        + 0.16 * np.minimum(payment_attempts, 10)
        + 3.2 * chargeback_rate
        + 0.8 * (hours_until_departure < 2)
        + 0.7 * (account_age < 7)
        + 0.55 * payment_actor
    )
    inventory_logit = (
        -4.0
        + 0.055 * np.minimum(seats, 40)
        + 0.045 * np.minimum(recent_holds, 35)
        + 0.28 * np.minimum(late_cancellations, 8)
        + 2.1 * cancellation_rate
        + 0.018 * np.minimum(bookings_24h, 70)
        + 0.7 * inventory_actor
    )

    frame = pd.DataFrame(
        {
            "event_day": np.sort(rng.integers(0, 365, row_count)),
            "account_age_days": account_age,
            "total_bookings_90d": total_bookings,
            "chargeback_rate_90d": chargeback_rate,
            "cancellation_rate_90d": cancellation_rate,
            "bookings_24h": bookings_24h,
            "recent_holds_24h": recent_holds,
            "recent_late_cancellations_90d": late_cancellations,
            "seats_requested": seats,
            "hours_until_departure": hours_until_departure,
            "country_mismatch": country_mismatch.astype(int),
            "payment_attempts_10m": payment_attempts,
            "device_linked_to_fraud": fraud_device.astype(int),
            "card_on_blocklist": blocklisted_card.astype(int),
            "interaction_duration_seconds": interaction_duration,
            "fields_pasted": fields_pasted,
            "pointer_events": pointer_events,
            "payment_fraud_label": rng.binomial(1, _sigmoid(payment_logit)),
            "inventory_abuse_label": rng.binomial(1, _sigmoid(inventory_logit)),
        }
    )
    return frame[["event_day", *MODEL_FEATURES, "payment_fraud_label", "inventory_abuse_label"]]


def main() -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    frame = generate_synthetic_bookings()
    frame.to_csv(DATA_PATH, index=False)
    print(f"Wrote {len(frame):,} disclosed synthetic rows to {DATA_PATH}")


if __name__ == "__main__":
    main()
