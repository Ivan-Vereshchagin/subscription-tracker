from typing import Optional
from pydantic import BaseModel, Field

from app.schemas.payment import PaymentResponse


class TransactionRaw(BaseModel):
    date: str
    amount: float
    currency: str
    description: str


class TransactionMatch(BaseModel):
    transaction_date: str
    transaction_amount: float
    transaction_currency: str
    transaction_description: str
    subscription_id: Optional[str]
    subscription_name: Optional[str]
    subscription_category: Optional[str]
    match_score: int = Field(..., ge=0, le=100)
    already_confirmed: bool
    match_reason: str


class StatementPreviewResponse(BaseModel):
    matched: list[TransactionMatch]
    unmatched: list[TransactionRaw]
    bank_detected: str
    total_transactions: int


class TransactionConfirmItem(BaseModel):
    transaction_date: str
    transaction_amount: float
    transaction_currency: str
    subscription_id: str


class StatementConfirmRequest(BaseModel):
    transactions: list[TransactionConfirmItem]


class StatementConfirmResponse(BaseModel):
    created: int
    skipped: int
    payments: list[PaymentResponse]
