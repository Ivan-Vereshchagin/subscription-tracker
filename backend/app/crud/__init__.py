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
    get_total_cost_by_period,
    get_cost_by_category,
    get_subscriptions_active_at_date,
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
    "get_total_cost_by_period",
    "get_cost_by_category",
    "get_subscriptions_active_at_date",
    # User
    "get_user",
    "get_user_by_email",
    "create_user",
    "update_user",
    "delete_user",
]
