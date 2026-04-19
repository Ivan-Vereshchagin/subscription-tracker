from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.payment import PaymentResponse
from app.schemas.statement import (
    StatementConfirmRequest,
    StatementConfirmResponse,
    StatementPreviewResponse,
)
from app.services.statement_parser import (
    calculate_period_end,
    check_existing_payment,
    match_transactions,
    parse_pdf,
)

router = APIRouter(prefix="/statements", tags=["Выписки"])



@router.post("/upload", response_model=StatementPreviewResponse)
async def upload_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Загрузить банковскую выписку и получить предварительный просмотр совпадений"""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Поддерживается только формат PDF")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 20 МБ)")

    try:
        transactions = parse_pdf(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Ошибка при чтении PDF")

    if not transactions:
        raise HTTPException(status_code=400, detail="Не найдено расходных транзакций в файле")

    matched, unmatched = match_transactions(transactions, db, current_user.id)

    return StatementPreviewResponse(
        matched=matched,
        unmatched=unmatched,
        bank_detected="sberbank",
        total_transactions=len(transactions),
    )


@router.post("/confirm", response_model=StatementConfirmResponse)
def confirm_statement_matches(
    data: StatementConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Подтвердить выбранные совпадения и создать записи о платежах"""
    created = 0
    skipped = 0
    payments = []

    for item in data.transactions:
        sub = (
            db.query(Subscription)
            .filter(
                Subscription.id == item.subscription_id,
                Subscription.user_id == current_user.id,
            )
            .first()
        )

        if not sub:
            skipped += 1
            continue

        txn_date = datetime.fromisoformat(item.transaction_date)

        if check_existing_payment(db, sub.id, current_user.id, txn_date):
            skipped += 1
            continue

        period_end = calculate_period_end(sub.billing_cycle, txn_date)

        payment = crud.payment.create_payment(
            db=db,
            subscription_id=sub.id,
            user_id=current_user.id,
            amount=Decimal(str(item.transaction_amount)),
            currency=item.transaction_currency,
            payment_date=txn_date,
            period_start=txn_date,
            period_end=period_end,
            status="completed",
        )

        if sub.next_billing_date is None or period_end > sub.next_billing_date:
            sub.next_billing_date = period_end
            db.commit()

        payments.append(payment)
        created += 1

    return StatementConfirmResponse(
        created=created,
        skipped=skipped,
        payments=[PaymentResponse.model_validate(p) for p in payments],
    )
