from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import Student, FaceEmbedding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
import json
import numpy as np
import cv2
import insightface
from passlib.context import CryptContext

router = APIRouter()

# Load buffalo_l → includes detection + recognition
app_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app_model.prepare(ctx_id=0, det_size=(640, 640))

SIMILARITY_THRESHOLD = 0.5
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def read_image_bytes(data: bytes):

    img_bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image data")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return img_rgb


def get_embedding(img_rgb):
    faces = app_model.get(img_rgb)
    if not faces:
        raise ValueError("No face detected in the image")
    face = faces[0]
    emb = face.embedding
    return emb / np.linalg.norm(emb)


def cosine_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

@router.get("/public-key")
async def get_public_key():
    with open("public.pem", "r") as f:
        return {"public_key": f.read()}

@router.post("/face-verify-register/")
async def face_verify_register(
    img1: UploadFile = File(...),
    img2: UploadFile = File(...),
    img3: UploadFile = File(...),
    iv1: str = Form(...),
    iv2: str = Form(...),
    iv3: str = Form(...),
    encryptedKey: UploadFile = File(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    usn: str = Form(...),
    branch: str = Form(...),
    year: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # --------------------------
        # 1️⃣ Load server private RSA key
        # --------------------------
        with open("private.pem", "rb") as f:
            private_key = serialization.load_pem_private_key(f.read(), password=None)

        encrypted_key_bytes = await encryptedKey.read()
        aes_key_bytes = private_key.decrypt(
            encrypted_key_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # --------------------------
        # 2️⃣ Helper to decrypt AES-GCM image
        # --------------------------
        async def decrypt_image(file: UploadFile, iv_str: str, aes_key: bytes) -> bytes:
            iv = bytes(int(x) for x in json.loads(iv_str))
            aesgcm = AESGCM(aes_key)
            encrypted_data = await file.read()
            return aesgcm.decrypt(iv, encrypted_data, None)
         # --------------------------
        # 3️⃣ Decrypt images
        # --------------------------
        img1_bytes = await decrypt_image(img1, iv1, aes_key_bytes)
        img2_bytes = await decrypt_image(img2, iv2, aes_key_bytes)
        img3_bytes = await decrypt_image(img3, iv3, aes_key_bytes)

        # 1️⃣ Extract embeddings
        emb1 = get_embedding(read_image_bytes(img1_bytes))
        emb2 = get_embedding(read_image_bytes(img2_bytes))
        emb3 = get_embedding(read_image_bytes(img3_bytes))

        # 2️⃣ Compare similarities
        sim12 = cosine_similarity(emb1, emb2)
        sim13 = cosine_similarity(emb1, emb3)
        sim23 = cosine_similarity(emb2, emb3)

        if sim12 >= SIMILARITY_THRESHOLD and sim13 >= SIMILARITY_THRESHOLD and sim23 >= SIMILARITY_THRESHOLD:
            # 3️⃣ Verification passed → store student
            hashed_pw = pwd_context.hash(password)
            student = Student(
                name=name,
                email=email,
                password_hash=hashed_pw,
                usn=usn,
                branch=branch,
                year=year
            )
            db.add(student)
            db.commit()
            db.refresh(student)

            # 4️⃣ Store embeddings
            embeddings = [emb1, emb2, emb3]
            angles = ["front", "left", "right"]  # could match frontend prompts
            for emb, angle in zip(embeddings, angles):
                face_emb = FaceEmbedding(
                    student_id=student.student_id,
                    embedding=emb.tolist(),
                    angle=angle
                )
                db.add(face_emb)
            db.commit()

            return {
                "message": "confirmation done",
                "similarities": {"sim12": sim12, "sim13": sim13, "sim23": sim23},
                "student_id": student.student_id
            }
        else:
            # 5️⃣ Verification failed → send response
            return {
                "message": "these images don't belong to the same person",
                "similarities": {"sim12": sim12, "sim13": sim13, "sim23": sim23}
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
