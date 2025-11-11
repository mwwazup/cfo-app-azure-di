"""
Pydantic validation models for API endpoints.
Provides comprehensive input validation with clear error messages.
"""
from pydantic import BaseModel, Field, validator, UUID4
from typing import Optional
from datetime import datetime


# ============================================================================
# Revenue Entry Models
# ============================================================================

class UpsertRevenueRequest(BaseModel):
    """Validated model for creating/updating revenue entries"""
    userId: str = Field(..., description="User ID (UUID format)")
    year: int = Field(..., ge=2000, le=2100, description="Year (2000-2100)")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    actualRevenue: Optional[float] = Field(None, ge=0, description="Actual revenue (non-negative)")
    desiredRevenue: Optional[float] = Field(None, ge=0, description="Desired revenue (non-negative)")
    targetRevenue: Optional[float] = Field(None, ge=0, description="Target revenue (non-negative)")
    profitMargin: Optional[float] = Field(None, ge=0, le=100, description="Profit margin percentage (0-100)")
    ownerDraws: Optional[float] = Field(None, ge=0, description="Owner distributions (non-negative)")
    isLocked: Optional[bool] = Field(None, description="Whether entry is locked")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes (max 1000 characters)")
    
    @validator('userId')
    def validate_user_id(cls, v):
        """Validate userId is a valid UUID format"""
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        # Basic UUID format check (allows both with and without hyphens)
        if len(v.replace('-', '')) != 32:
            raise ValueError('userId must be a valid UUID')
        return v
    
    @validator('year')
    def validate_year(cls, v):
        """Validate year is reasonable"""
        current_year = datetime.now().year
        if v > current_year + 10:
            raise ValueError(f'Year cannot be more than 10 years in the future (max: {current_year + 10})')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "userId": "user_123abc",
                "year": 2024,
                "month": 11,
                "actualRevenue": 50000.00,
                "desiredRevenue": 60000.00,
                "profitMargin": 25.5
            }
        }


class RevenueQueryParams(BaseModel):
    """Validated query parameters for revenue entries"""
    userId: str = Field(..., description="User ID")
    year: int = Field(..., ge=2000, le=2100, description="Year")
    month: Optional[int] = Field(None, ge=1, le=12, description="Month (optional)")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v


# ============================================================================
# KPI Record Models
# ============================================================================

class KPIRecordData(BaseModel):
    """Validated KPI record data"""
    period: str = Field(..., description="Period in YYYY-MM-DD format")
    kpi_name: str = Field(..., min_length=1, max_length=200, description="KPI name")
    kpi_category: str = Field(..., min_length=1, max_length=100, description="KPI category")
    kpi_value: float = Field(..., description="KPI value")
    goal_value: float = Field(..., description="Goal value")
    status: str = Field(..., description="KPI status (good, warning, alert)")
    trend_vs_last_month: Optional[float] = Field(None, description="Trend vs last month")
    action_suggestion: Optional[str] = Field(None, max_length=500, description="Action suggestion")
    display_format: Optional[str] = Field(None, max_length=50, description="Display format")
    plain_explanation: Optional[str] = Field(None, max_length=1000, description="Plain explanation")
    
    @validator('period')
    def validate_period(cls, v):
        """Validate period is in YYYY-MM-DD format"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('period must be in YYYY-MM-DD format')
        return v
    
    @validator('kpi_category')
    def validate_category(cls, v):
        """Validate KPI category"""
        valid_categories = ['revenue', 'profitability', 'growth', 'efficiency', 'liquidity']
        if v.lower() not in valid_categories:
            raise ValueError(f'kpi_category must be one of: {", ".join(valid_categories)}')
        return v.lower()


class UpsertKPIRequest(BaseModel):
    """Validated request for creating/updating KPI records"""
    userId: str = Field(..., description="User ID")
    kpiData: KPIRecordData = Field(..., description="KPI data")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v


class KPIQueryParams(BaseModel):
    """Validated query parameters for KPI records"""
    userId: str = Field(..., description="User ID")
    period: Optional[str] = Field(None, description="Period filter (YYYY-MM-DD)")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v
    
    @validator('period')
    def validate_period(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('period must be in YYYY-MM-DD format')
        return v


class DeleteKPIParams(BaseModel):
    """Validated parameters for deleting KPI records"""
    userId: str = Field(..., description="User ID")
    kpi_name: str = Field(..., min_length=1, description="KPI name to delete")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v


class UpdateKPIGoalRequest(BaseModel):
    """Validated request for updating KPI goal"""
    kpiId: str = Field(..., description="KPI record ID")
    goalValue: float = Field(..., description="New goal value")
    
    @validator('kpiId')
    def validate_kpi_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('kpiId cannot be empty')
        return v


# ============================================================================
# Financial Document Models
# ============================================================================

class FinancialDocumentCreate(BaseModel):
    """Validated model for creating financial documents"""
    userId: str = Field(..., description="User ID")
    document_type: str = Field(..., min_length=1, max_length=100, description="Document type")
    period_start: Optional[str] = Field(None, description="Period start date (YYYY-MM-DD)")
    period_end: Optional[str] = Field(None, description="Period end date (YYYY-MM-DD)")
    filename: Optional[str] = Field(None, max_length=500, description="Filename")
    file_path: Optional[str] = Field(None, max_length=1000, description="File path")
    raw_json: Optional[dict] = Field(None, description="Raw JSON data")
    summary_metrics: Optional[dict] = Field(None, description="Summary metrics")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v
    
    @validator('period_start', 'period_end')
    def validate_dates(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @validator('document_type')
    def validate_document_type(cls, v):
        valid_types = ['profit_loss', 'balance_sheet', 'cash_flow', 'other']
        if v.lower() not in valid_types:
            raise ValueError(f'document_type must be one of: {", ".join(valid_types)}')
        return v.lower()


class FinancialDocumentUpdate(BaseModel):
    """Validated model for updating financial documents"""
    document_type: Optional[str] = Field(None, max_length=100)
    period_start: Optional[str] = Field(None)
    period_end: Optional[str] = Field(None)
    filename: Optional[str] = Field(None, max_length=500)
    raw_json: Optional[dict] = Field(None)
    summary_metrics: Optional[dict] = Field(None)
    
    @validator('period_start', 'period_end')
    def validate_dates(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v


# ============================================================================
# AI Chat Models (from chat.py)
# ============================================================================

class AICoachRequest(BaseModel):
    """Validated request for AI coach"""
    userMessage: str = Field(..., min_length=1, max_length=5000, description="User message")
    userId: str = Field(..., description="User ID")
    provider: Optional[str] = Field('claude', description="AI provider (claude or openai)")
    max_tokens: Optional[int] = Field(1024, ge=1, le=4096, description="Max tokens (1-4096)")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="Temperature (0-2)")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v
    
    @validator('provider')
    def validate_provider(cls, v):
        if v not in ['claude', 'openai']:
            raise ValueError('provider must be either "claude" or "openai"')
        return v


class AICoachResponse(BaseModel):
    """Response from AI coach"""
    response: str
    provider: str
    tokens_used: Optional[int] = None


# ============================================================================
# Common Query Parameter Models
# ============================================================================

class UserIdQuery(BaseModel):
    """Simple userId query parameter"""
    userId: str = Field(..., description="User ID")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v


class YearQuery(BaseModel):
    """Year query parameter"""
    userId: str = Field(..., description="User ID")
    year: int = Field(..., ge=2000, le=2100, description="Year")
    
    @validator('userId')
    def validate_user_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('userId cannot be empty')
        return v
