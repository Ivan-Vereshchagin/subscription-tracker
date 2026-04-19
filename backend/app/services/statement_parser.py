import io
import re
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.subscription import Subscription
from app.schemas.statement import TransactionRaw, TransactionMatch


BILLING_CYCLE_DAYS = {
    "weekly": 7,
    "monthly": 30,
    "quarterly": 90,
    "semi-annual": 180,
    "yearly": 365,
}

# DD.MM.YYYY HH:MM  КАТЕГОРИЯ  СУММА  ОСТАТОК
TRANSACTION_RE = re.compile(
    r'^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(.+?)\s+([+]?[\d ]+,\d{2})\s+([\d ]+,\d{2})\s*$'
)

# DD.MM.YYYY  6-значный код авторизации  название магазина...
DETAIL_RE = re.compile(
    r'^(\d{2}\.\d{2}\.\d{4})\s+(\d{6})\s+(.*)'
)


def parse_date(value: str) -> Optional[datetime]:
    for fmt in ("%d.%m.%Y %H:%M:%S", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return None


def clean_amount(value: str) -> Optional[float]:
    cleaned = (
        value
        .replace(",", ".")
        .replace(" ", "")
        .replace("\xa0", "")
        .replace("\u2009", "")
    )
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_sberbank_text(text: str) -> list[TransactionRaw]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    transactions = []
    pending: Optional[dict] = None

    for line in lines:
        txn_match = TRANSACTION_RE.match(line)

        if txn_match:
            if pending:
                transactions.append(TransactionRaw(**pending))

            raw_amount = txn_match.group(4)

            # пропускаем пополнения (знак + перед суммой)
            if raw_amount.lstrip().startswith("+"):
                pending = None
                continue

            amount = clean_amount(raw_amount)
            if amount is None:
                pending = None
                continue

            pending = {
                "date": datetime.strptime(txn_match.group(1), "%d.%m.%Y").date().isoformat(),
                "amount": abs(amount),
                "currency": "RUB",
                "description": txn_match.group(3).strip(),
            }
            continue

        if pending:
            detail_match = DETAIL_RE.match(line)
            if detail_match:
                merchant_raw = detail_match.group(3).strip()
                # убираем суффикс ". Операция по карте ****XXXX"
                merchant = re.sub(r"\.?\s*Операция по(?:\s+карте.*)?$", "", merchant_raw).strip().rstrip(".")
                if merchant:
                    pending["description"] = merchant
                transactions.append(TransactionRaw(**pending))
                pending = None

    if pending:
        transactions.append(TransactionRaw(**pending))

    return transactions


def parse_pdf(content: bytes) -> list[TransactionRaw]:
    import pdfplumber

    transactions = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                transactions.extend(parse_sberbank_text(text))

    return transactions


def name_matches(sub_name: str, description: str) -> bool:
    name = sub_name.lower()
    desc = description.lower()
    if name in desc or desc in name:
        return True
    for word in name.split():
        if len(word) > 3 and word in desc:
            return True
    return False


def check_existing_payment(
    db: Session, subscription_id: str, user_id: str, txn_date: datetime
) -> bool:
    window = timedelta(days=5)
    return (
        db.query(Payment)
        .filter(
            Payment.subscription_id == subscription_id,
            Payment.user_id == user_id,
            Payment.status == "completed",
            Payment.payment_date >= txn_date - window,
            Payment.payment_date <= txn_date + window,
        )
        .first()
        is not None
    )


def match_transactions(
    transactions: list[TransactionRaw],
    db: Session,
    user_id: str,
) -> tuple[list[TransactionMatch], list[TransactionRaw]]:
    subscriptions = (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.is_active == True)
        .all()
    )

    matched: list[TransactionMatch] = []
    unmatched: list[TransactionRaw] = []

    for txn in transactions:
        txn_date = datetime.fromisoformat(txn.date)
        best_sub = None
        best_score = 0
        best_reasons: list[str] = []

        for sub in subscriptions:
            score = 0
            reasons: list[str] = []

            price_f = float(sub.price)
            if price_f > 0 and abs(price_f - txn.amount) / price_f < 0.01:
                score += 50
                reasons.append("amount")

            if name_matches(sub.name, txn.description):
                score += 30
                reasons.append("name")

            if sub.next_billing_date:
                days_diff = abs((txn_date - sub.next_billing_date).days)
                if days_diff <= 5:
                    score += 20
                    reasons.append("date")

            if sub.currency == txn.currency:
                score += 5

            if score > best_score and score >= 50:
                best_score = score
                best_sub = sub
                best_reasons = reasons

        if best_sub:
            already = check_existing_payment(db, best_sub.id, user_id, txn_date)
            matched.append(
                TransactionMatch(
                    transaction_date=txn.date,
                    transaction_amount=txn.amount,
                    transaction_currency=txn.currency,
                    transaction_description=txn.description,
                    subscription_id=best_sub.id,
                    subscription_name=best_sub.name,
                    subscription_category=best_sub.category,
                    match_score=min(best_score, 100),
                    already_confirmed=already,
                    match_reason="+".join(best_reasons),
                )
            )
        else:
            unmatched.append(txn)

    return matched, unmatched


def calculate_period_end(billing_cycle: str, from_date: datetime) -> datetime:
    days = BILLING_CYCLE_DAYS.get(billing_cycle, 30)
    return from_date + timedelta(days=days)
