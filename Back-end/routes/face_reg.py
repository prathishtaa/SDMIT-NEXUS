from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import cv2
import insightface

router = APIRouter()

# Load buffalo_l → includes detection + recognition
app_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app_model.prepare(ctx_id=0, det_size=(640, 640))

SIMILARITY_THRESHOLD = 0.5


def read_image(file: UploadFile):
    """Read image and convert BGR→RGB"""
    data = file.file.read()
    img_bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image file")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)  # ✅ required
    return img_rgb


def get_embedding(img_rgb):
    """Detect → align → embed"""
    faces = app_model.get(img_rgb)
    if not faces:
        raise ValueError("No face detected in the image")
    
    face = faces[0]  # pick largest / first
    emb = face.embedding

    # ✅ Normalize embedding vector (L2 norm)
    emb = emb / np.linalg.norm(emb)
    return emb


def cosine_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))


@router.post("/verify/")
async def verify_faces(img1: UploadFile = File(...),
                       img2: UploadFile = File(...),
                       img3: UploadFile = File(...)):
    try:
        emb1 = get_embedding(read_image(img1))
        emb2 = get_embedding(read_image(img2))
        emb3 = get_embedding(read_image(img3))

        sim12 = cosine_similarity(emb1, emb2)
        sim13 = cosine_similarity(emb1, emb3)
        sim23 = cosine_similarity(emb2, emb3)

        if sim12 >= SIMILARITY_THRESHOLD and sim13 >= SIMILARITY_THRESHOLD and sim23 >= SIMILARITY_THRESHOLD:
            avg_emb = np.mean([emb1, emb2, emb3], axis=0)
            avg_emb = avg_emb / np.linalg.norm(avg_emb)  # normalize average
            return {
                "message": "confirmation done",
                "similarities": {"sim12": sim12, "sim13": sim13, "sim23": sim23},
                "average_embedding": avg_emb.tolist()
            }
        else:
            return {
                "message": "these images don't belong to the same person",
                "similarities": {"sim12": sim12, "sim13": sim13, "sim23": sim23}
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
