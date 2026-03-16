# Модель платежа (история списаний)

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.subscription import Subscription
    from app.models.user import User


class Payment(Base):
    """Платёж/списание подписки"""

    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    
    subscription_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    
    currency: Mapped[str] = mapped_column(
        String(3),
        default="RUB",
        nullable=False
    )
    
    payment_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True
    )
    
    period_start: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    
    period_end: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    
    status: Mapped[str] = mapped_column(
        String(20),
        default="completed",  # pending, completed, failed, cancelled
        nullable=False,
        index=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    subscription: Mapped["Subscription"] = relationship(
        "Subscription",
        back_populates="payments"
    )
    
    user: Mapped["User"] = relationship(
        "User",
        back_populates="payments"
    )

    def __repr__(self) -> str:
        return f"<Payment {self.amount} {self.currency} on {self.payment_date}>"
