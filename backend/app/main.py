from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

from backend.app.routers import auth, donations, shelters, admin, volunteers, donors
app.include_router(auth.router)
app.include_router(donations.router)
app.include_router(shelters.router)
app.include_router(shelters.admin_router)
app.include_router(admin.router)
app.include_router(admin.forecast_router)
app.include_router(volunteers.router)
app.include_router(donors.router)
app.include_router(donors.admin_router)
