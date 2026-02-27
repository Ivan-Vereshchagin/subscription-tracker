from fastapi import FastAPI

app = FastAPI(
    title="Subscription Tracker",
    description="Сервис управления подписками и регулярными платежами",
    version="0.1.0"
)


@app.get("/health")
def health_check():
    """Проверка работоспособности API"""
    return {"status": "ok"}


@app.get("/")
def root():
    """Корневой endpoint"""
    return {"message": "Welcome to Subscription Tracker API"}
