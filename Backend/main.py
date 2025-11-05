from fastapi import FastAPI
from db import Base, engine
import models
from routes import admin, auth, chats, face_reg, login,students_groups_get, lecturer, lect_groups_get,post_files,post_del_documents,sign,sse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.staticfiles import StaticFiles
from utils.email_notifications import email_service
import logging

logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)
app.mount("/static", StaticFiles(directory="uploads"), name="static")
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chats.router, prefix="/chats", tags=["Chats"])
app.include_router(face_reg.router, prefix="/face_reg", tags=["Face"]) 
app.include_router(login.router, prefix="/login", tags=["login"])
app.include_router(students_groups_get.router,prefix="/groups", tags=["Groups"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(lecturer.router, prefix="/lecturer", tags=["lecturer"])
app.include_router(lect_groups_get.router, prefix="/lecturer-groups", tags=["lecturer_groups"])
app.include_router(post_files.router, prefix="/files", tags=["files"])
app.include_router(post_del_documents.router, prefix="/documents", tags=["documents"])
app.include_router(sign.router, prefix="/sign-document", tags=["sign"])
app.include_router(sse.router,prefix="/sse",tags=["sse"])

@app.on_event("startup")
async def startup_event():
    """Initialize email service scheduler on startup"""
    logger.info("Email notification service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown email service scheduler on shutdown"""
    email_service.scheduler.shutdown()
    logger.info("Email notification service shutdown")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
