"""
CRUD операции
"""
from app.crud.subscription import (
    get_subscriptions,
    get_subscription,
    create_subscription,
    update_subscription,
    delete_subscription,
    get_total_monthly_cost,
)
from app.crud.user import (
    get_user,
    get_user_by_email,
    create_user,
    update_user,
    delete_user,
)

__all__ = [
    # Subscription
    "get_subscriptions",
    "get_subscription",
    "create_subscription",
    "update_subscription",
    "delete_subscription",
    "get_total_monthly_cost",
    # User
    "get_user",
    "get_user_by_email",
    "create_user",
    "update_user",
    "delete_user",
]
