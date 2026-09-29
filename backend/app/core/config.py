import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    CarePath Backend Configuration.
    Secrets must remain server-side and never be returned in client responses or logs.
    """
    SUPABASE_URL: str = Field(default="https://yxtlscoicgnwtwyjqfdn.supabase.co", description="Supabase project URL")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Supabase service role secret key")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API secret key")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="Multimodal model for document extraction")
    PORT: int = Field(default=8000, description="FastAPI server port")
    HOST: str = Field(default="0.0.0.0", description="FastAPI server host")
    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", description="Allowed CORS origins")

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
