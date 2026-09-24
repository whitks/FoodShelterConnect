from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "mealmate"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GEMINI_API_KEY: str | None = None
    # Vision model for the food-image feature. Flash models only (fast + cheap).
    # Default is gemini-3.5-flash-lite: cheapest tier, highest free-tier limits
    # (~15 RPM / ~1,000 RPD). Swap to gemini-3.6-flash for better fine-detail
    # quality (egg counting) once billing is enabled.
    GEMINI_VISION_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_VISION_MAX_IMAGES: int = 10
    GEMINI_VISION_MAX_MB: int = 10

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
