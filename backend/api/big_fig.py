"""Big Fig / Lighthouse goal API endpoints.

Stores and retrieves long-term revenue "Lighthouse" goals and a simple
plan from current revenue to the target.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import get_supabase_db
from logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["big-fig", "lighthouse"])


class LighthouseGoalRequest(BaseModel):
    """Request payload to create or update a Lighthouse goal."""

    userId: str = Field(..., description="User ID (Clerk user ID)")
    targetAnnualRevenue: float = Field(..., gt=0, description="Target annual revenue")
    yearsToGoal: int = Field(..., gt=0, description="Rough number of years to reach the Lighthouse")
    targetOwnerPay: Optional[float] = Field(None, ge=0, description="Target owner pay")
    targetProfitMargin: Optional[float] = Field(None, ge=0, le=100, description="Target profit margin percentage")
    avgJobValue: Optional[float] = Field(
        None,
        ge=0,
        description="Average revenue per job assumption used for Lighthouse path calculations",
    )
    jobsPerCrewPerMonth: Optional[float] = Field(
        None,
        ge=0,
        description="Jobs per crew per month assumption used for Lighthouse path calculations",
    )
    notes: Optional[str] = Field(None, max_length=2000, description="Optional notes about the goal")


class LighthouseGoalResponse(BaseModel):
    id: str
    userId: str
    targetAnnualRevenue: float
    targetOwnerPay: Optional[float] = None
    targetProfitMargin: Optional[float] = None
    yearsToGoal: Optional[int] = None
    targetYear: int
    targetMonth: int
    avgJobValue: Optional[float] = None
    jobsPerCrewPerMonth: Optional[float] = None
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str


class LighthousePlanResponse(BaseModel):
    currentAnnualRevenue: float
    targetAnnualRevenue: float
    yearsToGoal: int
    targetYear: int
    targetMonth: int
    requiredAnnualIncrease: float
    requiredMonthlyIncrease: float


def _row_to_goal_response(row: dict) -> LighthouseGoalResponse:
    return LighthouseGoalResponse(
        id=str(row.get("id")),
        userId=str(row.get("user_id")),
        targetAnnualRevenue=float(row.get("target_annual_revenue" or 0) or 0),
        targetOwnerPay=float(row["target_owner_pay"]) if row.get("target_owner_pay") is not None else None,
        targetProfitMargin=float(row["target_profit_margin"]) if row.get("target_profit_margin") is not None else None,
        yearsToGoal=int(row["years_to_goal"]) if row.get("years_to_goal") is not None else None,
        targetYear=int(row.get("target_year")),
        targetMonth=int(row.get("target_month")),
        avgJobValue=float(row["avg_job_value"]) if row.get("avg_job_value") is not None else None,
        jobsPerCrewPerMonth=float(row["jobs_per_crew_per_month"]) if row.get("jobs_per_crew_per_month") is not None else None,
        notes=row.get("notes"),
        createdAt=str(row.get("created_at")),
        updatedAt=str(row.get("updated_at")),
    )


@router.get("/api/big-fig/goal", response_model=Optional[LighthouseGoalResponse])
async def get_lighthouse_goal(userId: str = Query(..., description="User ID")):
    """Get the current Lighthouse goal for a user.

    Returns `null` when the user has not set a Lighthouse goal yet.
    """
    if not userId or not userId.strip():
        raise HTTPException(status_code=400, detail="userId cannot be empty")

    try:
        supabase = get_supabase_db()
        result = (
            supabase.table("big_fig_goals")
            .select("*")
            .eq("user_id", userId)
            .limit(1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            return None
        return _row_to_goal_response(rows[0])
    except Exception as e:
        logger.error(f"Error fetching Lighthouse goal for {userId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/api/big-fig/goal", response_model=LighthouseGoalResponse)
async def upsert_lighthouse_goal(payload: LighthouseGoalRequest):
    """Create or update the Lighthouse goal for a user.

    Computes a rough target year/month from yearsToGoal.
    """
    user_id = payload.userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId cannot be empty")

    now = datetime.utcnow()
    # For Phase 1, treat yearsToGoal as a rough full-year count and use December
    target_year = now.year + payload.yearsToGoal
    target_month = 12

    try:
        supabase = get_supabase_db()

        # Look for an existing goal for this user
        existing_result = (
            supabase.table("big_fig_goals")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        existing_rows = existing_result.data or []
        existing_row = existing_rows[0] if existing_rows else None

        now_iso = datetime.utcnow().isoformat()

        base_data = {
            "user_id": user_id,
            "target_annual_revenue": payload.targetAnnualRevenue,
            "target_owner_pay": payload.targetOwnerPay,
            "target_profit_margin": payload.targetProfitMargin,
            "years_to_goal": payload.yearsToGoal,
            "target_year": target_year,
            "target_month": target_month,
            "avg_job_value": payload.avgJobValue,
            "jobs_per_crew_per_month": payload.jobsPerCrewPerMonth,
            "notes": payload.notes,
            "updated_at": now_iso,
        }

        if existing_row:
            # Update existing row, preserve original created_at if present
            update_data = {
                **base_data,
                "created_at": existing_row.get("created_at") or now_iso,
            }

            result = (
                supabase.table("big_fig_goals")
                .update(update_data)
                .eq("id", existing_row["id"])
                .execute()
            )
        else:
            # Insert new row with created_at set
            insert_data = {
                **base_data,
                "created_at": now_iso,
            }

            result = supabase.table("big_fig_goals").insert(insert_data).execute()

        rows = result.data or []
        if not rows:
            # As a fallback, fetch the row explicitly
            fetch = (
                supabase.table("big_fig_goals")
                .select("*")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            rows = fetch.data or []
            if not rows:
                raise HTTPException(status_code=500, detail="Failed to persist Lighthouse goal")

        return _row_to_goal_response(rows[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error upserting Lighthouse goal for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/api/big-fig/plan", response_model=LighthousePlanResponse)
async def get_lighthouse_plan(userId: str = Query(..., description="User ID")):
    """Return a simple Lighthouse plan from current revenue to the target.

    - currentAnnualRevenue: sum of actual_revenue for the current calendar year (YTD)
    - requiredAnnualIncrease: (target - current) / yearsToGoal (min 0)
    - requiredMonthlyIncrease: requiredAnnualIncrease / 12
    """
    if not userId or not userId.strip():
        raise HTTPException(status_code=400, detail="userId cannot be empty")

    try:
        supabase = get_supabase_db()

        # 1) Fetch Lighthouse goal
        goal_result = (
            supabase.table("big_fig_goals")
            .select("*")
            .eq("user_id", userId)
            .limit(1)
            .execute()
        )
        goal_rows = goal_result.data or []
        if not goal_rows:
            raise HTTPException(status_code=404, detail="No Lighthouse goal found for this user")

        goal_row = goal_rows[0]
        goal = _row_to_goal_response(goal_row)

        # 2) Compute current annual revenue (YTD for current year)
        now = datetime.utcnow()
        current_year = now.year

        revenue_result = (
            supabase.table("revenue_entries")
            .select("year, month, actual_revenue")
            .eq("user_id", userId)
            .eq("year", current_year)
            .execute()
        )
        revenue_rows = revenue_result.data or []

        current_annual_revenue = 0.0
        for row in revenue_rows:
            value = row.get("actual_revenue")
            if value is not None:
                try:
                    current_annual_revenue += float(value)
                except (TypeError, ValueError):
                    continue

        # 3) Compute required increases
        target = goal.targetAnnualRevenue
        years_to_goal = goal.yearsToGoal or 1
        gap = max(target - current_annual_revenue, 0.0)
        required_annual = gap / years_to_goal if years_to_goal > 0 else 0.0
        required_monthly = required_annual / 12.0

        return LighthousePlanResponse(
            currentAnnualRevenue=current_annual_revenue,
            targetAnnualRevenue=target,
            yearsToGoal=years_to_goal,
            targetYear=goal.targetYear,
            targetMonth=goal.targetMonth,
            requiredAnnualIncrease=required_annual,
            requiredMonthlyIncrease=required_monthly,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building Lighthouse plan for {userId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
