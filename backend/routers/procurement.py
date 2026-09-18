import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db, AsyncSessionLocal
from ..models import PurchaseRequest, SupplierScore, ApprovalDecision
from ..schemas import (
    PurchaseRequestCreate, PurchaseRequestResponse,
    SupplierScoreRequest, SupplierScoreAcceptedResponse, SupplierScoreResult,
    OrchestratorRequest,
)

router = APIRouter()


@router.post("/request", response_model=PurchaseRequestResponse, status_code=201)
async def submit_purchase_request(
    req: PurchaseRequestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    request_id = f"PR-{uuid.uuid4().hex[:8].upper()}"
    pr = PurchaseRequest(request_id=request_id, **req.model_dump())
    db.add(pr)
    await db.commit()
    await db.refresh(pr)

    orch_req = OrchestratorRequest(
        request_type="purchase_request",
        payload={**req.model_dump(), "request_id": request_id},
        pilot_team=req.pilot_team,
    )
    background_tasks.add_task(_run_orch_in_new_session, orch_req)

    return PurchaseRequestResponse(
        request_id=pr.request_id,
        requester=pr.requester,
        supplier_name=pr.supplier_name,
        category=pr.category,
        value=pr.value,
        currency=pr.currency,
        description=pr.description,
        pilot_team=pr.pilot_team,
        status=pr.status,
        submitted_at=pr.submitted_at,
    )


@router.get("/request/{request_id}")
async def get_request_status(request_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PurchaseRequest).where(PurchaseRequest.request_id == request_id)
    )
    pr = result.scalar_one_or_none()
    if not pr:
        raise HTTPException(status_code=404, detail="Request not found")

    decision_result = await db.execute(
        select(ApprovalDecision).where(ApprovalDecision.request_id == request_id)
    )
    decision = decision_result.scalar_one_or_none()

    score_result = await db.execute(
        select(SupplierScore)
        .where(SupplierScore.request_id == request_id)
        .order_by(SupplierScore.id.desc())
    )
    score = score_result.scalar_one_or_none()

    import json
    return {
        "request_id": pr.request_id,
        "requester": pr.requester,
        "supplier_name": pr.supplier_name,
        "category": pr.category,
        "value": pr.value,
        "currency": pr.currency,
        "status": pr.status,
        "submitted_at": pr.submitted_at,
        "approval_decision": {
            "policy_rule_id": decision.policy_rule_id,
            "approval_chain": json.loads(decision.approval_chain),
            "sla_hours": decision.sla_hours,
            "is_policy_gap": bool(decision.is_policy_gap),
            "status": decision.status,
        } if decision else None,
        "supplier_score": {
            "composite": score.composite_score,
            "status": score.status,
            "confidence": score.confidence,
        } if score else None,
    }


@router.post("/supplier/score", response_model=SupplierScoreAcceptedResponse, status_code=202)
async def score_supplier(
    req: SupplierScoreRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Generate a unique ID for this scoring job BEFORE queuing the background task.
    # The agent writes this same ID into the supplier_scores row so the GET
    # endpoint can retrieve the exact result for this specific request.
    score_id = str(uuid.uuid4())

    # Embed score_id and category into the orchestrator payload so they flow
    # all the way down to SupplierScoringAgent.score() → DB row.
    payload = {**req.model_dump(), "score_id": score_id}

    orch_req = OrchestratorRequest(
        request_type="supplier_score",
        payload=payload,
        pilot_team=req.pilot_team,
    )
    background_tasks.add_task(_run_orch_in_new_session, orch_req)

    return SupplierScoreAcceptedResponse(
        status="accepted",
        score_id=score_id,
        supplier_name=req.supplier_name,
        category=req.category,
    )


@router.get("/supplier/score/{score_id}")
async def get_supplier_score(
    score_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll this endpoint after POST /supplier/score.

    Returns 404 while the background task is still running (the row does not
    exist yet).  Returns the full score record once the agent has persisted it.
    """
    import json as _json
    result = await db.execute(
        select(SupplierScore).where(SupplierScore.score_id == score_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Score not ready yet")

    # Parse source_chunks JSON (stored as a string in SQLite)
    try:
        chunks = _json.loads(row.source_chunks) if row.source_chunks else {}
    except Exception:
        chunks = {}

    return SupplierScoreResult(
        score_id=row.score_id,
        supplier_name=row.supplier_name,
        category=row.category,
        reliability_score=row.reliability_score or 0.0,
        compliance_score=row.compliance_score or 0.0,
        cost_score=row.cost_score or 0.0,
        risk_score=row.risk_score or 0.0,
        fit_score=row.fit_score or 0.0,
        composite_score=row.composite_score or 0.0,
        status=row.status or "unknown",
        confidence=row.confidence or 0.0,
        source_chunks=chunks,
        prompt_version=row.prompt_version,
        scored_at=row.scored_at,
    )


@router.post("/process-discovery")
async def trigger_process_discovery(
    background_tasks: BackgroundTasks,
    pilot_team: str = Query(None),
):
    orch_req = OrchestratorRequest(
        request_type="process_discovery",
        payload={"trigger": "on_demand"},
        pilot_team=pilot_team,
    )
    background_tasks.add_task(_run_orch_in_new_session, orch_req)
    return {"message": "Process discovery triggered", "pilot_team": pilot_team}


@router.post("/weekly-report")
async def generate_weekly_report(
    background_tasks: BackgroundTasks,
    pilot_team: str = Query(None),
):
    orch_req = OrchestratorRequest(
        request_type="weekly_report",
        payload={"trigger": "manual"},
        pilot_team=pilot_team,
    )
    background_tasks.add_task(_run_orch_in_new_session, orch_req)
    return {"message": "Weekly report generation triggered", "pilot_team": pilot_team}


async def _run_orch_in_new_session(orch_req: OrchestratorRequest):
    from ..agents.orchestrator import run_orchestrator
    try:
        await run_orchestrator(orch_req)
    except Exception as exc:
        print(f"[orchestrator-background] error: {exc}")
