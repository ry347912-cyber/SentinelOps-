"""
Configuration Management
Loads all settings from environment variables with sensible defaults.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AIOps Platform"
    DEBUG: bool = False
    API_VERSION: str = "v1"

    # Database
    DATABASE_URL: str = "sqlite:///./aiops.db"

    # Security
    SECRET_KEY: str = "aiops-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://frontend:80",
    ]

    # Anthropic AI (Claude)
    ANTHROPIC_API_KEY: str = ""

    # OpenAI (optional fallback)
    OPENAI_API_KEY: str = ""

    # Vector Store
    VECTOR_STORE_PATH: str = "./vector_store"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Incident Detection
    CPU_THRESHOLD: float = 85.0
    MEMORY_THRESHOLD: float = 90.0
    ERROR_RATE_THRESHOLD: int = 10  # errors per minute
    ANOMALY_CONFIDENCE_THRESHOLD: float = 0.7

    # Alerts
    ALERT_EMAIL: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587

    # Background tasks
    LOG_ANALYSIS_INTERVAL: int = 30  # seconds
    INCIDENT_SCAN_INTERVAL: int = 60  # seconds

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
