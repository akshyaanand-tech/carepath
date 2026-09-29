import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health, documents, intelligence, family, consent, doctor

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("carepath.backend")

app = FastAPI(
    title="CarePath AI Intelligence Engine",
    description="Deterministic FastAPI backend providing multimodal OpenAI document understanding, clinical validation, family permissions, temporary QR doctor consent, timeline aggregation, and audit logging.",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.cors_origin_list
logger.info(f"Configuring CORS for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(intelligence.router)
app.include_router(family.router)
app.include_router(consent.router)
app.include_router(doctor.router)


@app.get("/")
def root():
    return {
        "service": "CarePath AI Intelligence Engine",
        "sprint": "Sprint 5: Family Dashboard, Consent, QR Doctor Access & Security",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "timeline": "/api/timeline",
            "calendar": "/api/calendar",
            "mismatches": "/api/mismatches",
            "documents": "/api/documents",
            "family": "/api/family",
            "consent": "/api/consent",
            "doctor": "/api/doctor",
        },
        "status": "online",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
