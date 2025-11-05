from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import cv2, numpy as np
import insightface
from models import DocumentSignature,FaceEmbedding, Document
from db import get_db, SessionLocal
from utils.auth_utils import get_current_user 

router=APIRouter()

# Load InsightFace model
app_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app_model.prepare(ctx_id=0, det_size=(640, 640))

SIMILARITY_THRESHOLD = 0.5

# Utility functions
def read_image_from_bytes(file_bytes: bytes):
    img_array = np.frombuffer(file_bytes, np.uint8)
    img_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image")
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

def get_embedding(img_rgb: np.ndarray):
    faces = app_model.get(img_rgb)
    if not faces:
        return None
    emb = faces[0].embedding
    emb = emb / np.linalg.norm(emb)
    return emb.astype(float).tolist()

def cosine_similarity(emb1, emb2):
    emb1, emb2 = np.array(emb1), np.array(emb2)
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

# -------------------------
# Document signing endpoint
# -------------------------
@router.post("/{document_id}/sign")
async def sign_document(
    document_id: int,
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    student_id = current_user["id"]
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can sign documents")
    doc = db.query(Document).filter_by(document_id=document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not images or len(images) == 0:
        raise HTTPException(status_code=400, detail="No images provided")

    # Get all stored embeddings for this student
    stored_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student_id
    ).all()
    if not stored_embeddings:
        raise HTTPException(status_code=404, detail="No embeddings found for this student")

    verified = False
    best_similarity = 0.0

    # Compare each uploaded image with all stored embeddings
    for image_file in images:
        img_bytes = await image_file.read()
        img_rgb = read_image_from_bytes(img_bytes)
        new_emb = get_embedding(img_rgb)
        if new_emb is None:
            continue

        for emb in stored_embeddings:
            sim = cosine_similarity(new_emb, emb.embedding)
            if sim > best_similarity:
                best_similarity = sim

            if sim >= SIMILARITY_THRESHOLD:
                verified = True
                break
        if verified:
            break

    if not verified:
        raise HTTPException(status_code=403, detail="Face does not match your account")

    # Save signature record in DocumentSignature table
    new_signature = DocumentSignature(
        document_id=document_id,
        student_id=student_id
    )
    db.add(new_signature)
    db.commit()
    db.refresh(new_signature)

    # Optionally, save the verified image for auditing
    return JSONResponse({
        "document_id": document_id,
        "student_id": student_id,
        "signed": True,
        "signature_id": new_signature.signature_id,
        "best_similarity": round(best_similarity, 4)
    })
