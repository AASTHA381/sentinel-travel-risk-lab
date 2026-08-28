import json
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.briefing import generate_analyst_brief
from app.detective import agent_network as load_agent_network
from app.model_service import model_store
from app.risk import assess_booking
from app.schemas import (
    AnalystBriefRequest,
    AnalystBriefResponse,
    BookingAssessmentRequest,
    BookingAssessmentResponse,
)


app = FastAPI(
    title="Travel Fraud Lab API",
    version="0.1.0",
    description="Research prototype using synthetic data; not for production decisions.",
)
_default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_extra_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOW_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engine_mode": model_store.mode}


@app.get("/api/model")
def model_metadata() -> dict:
    metadata_path = Path(__file__).resolve().parents[1] / "artifacts" / "metadata.json"
    if not metadata_path.exists():
        raise HTTPException(status_code=503, detail="Model artifacts have not been trained")
    return json.loads(metadata_path.read_text(encoding="utf-8"))


@app.get("/api/network/{agent_id}")
def agent_network(agent_id: str) -> dict:
    return load_agent_network(agent_id)


@app.post("/api/brief", response_model=AnalystBriefResponse)
def analyst_brief(request: AnalystBriefRequest) -> AnalystBriefResponse:
    return generate_analyst_brief(request.assessment)


@app.post("/api/assess", response_model=BookingAssessmentResponse)
def assess(request: BookingAssessmentRequest) -> BookingAssessmentResponse:
    return assess_booking(request)
