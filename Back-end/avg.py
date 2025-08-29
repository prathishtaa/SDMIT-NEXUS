import cv2
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import insightface

# =====================
# Load Face Model
# =====================
app_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app_model.prepare(ctx_id=0, det_size=(640, 640))

SIMILARITY_THRESHOLD = 0.5

# =====================
# Helper Functions
# =====================
def read_image(path):
    """Load image (BGR -> RGB)"""
    img_bgr = cv2.imread(path)
    if img_bgr is None:
        raise ValueError(f"Invalid image: {path}")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return img_rgb

def get_embedding(img_rgb):
    """Detect -> Align -> Embed"""
    faces = app_model.get(img_rgb)
    if not faces:
        return None
    emb = faces[0].embedding
    emb = emb / np.linalg.norm(emb)
    return emb

def get_average_embedding(img_paths):
    """Compute average embedding for a person"""
    embs = []
    for path in img_paths:
        try:
            emb = get_embedding(read_image(path))
            if emb is not None:
                embs.append(emb)
        except Exception as e:
            print(f"⚠️ Skipping {path} - {e}")
    
    if not embs:
        return None
    avg_emb = np.mean(embs, axis=0)
    avg_emb = avg_emb / np.linalg.norm(avg_emb)  # normalize
    return avg_emb

def cosine_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

def compare_embeddings(emb1, emb2):
    """Return similarity score and prediction"""
    sim = cosine_similarity(emb1, emb2)
    pred = 1 if sim >= SIMILARITY_THRESHOLD else 0
    return sim, pred

# =====================
# Evaluation Function
# =====================
def evaluate_embeddings(people_embeddings, test_pairs, single_image_mode=False):
    """
    people_embeddings: dict {"person1": avg_emb1, "person2": avg_emb2, ...}
    test_pairs: list of tuples
        If single_image_mode = False: (person1, person2, label)  # avg vs avg
        If single_image_mode = True: (single_img_path, person_name, label)  # single vs avg
    """
    y_true, y_pred = [], []

    for a, b, label in test_pairs:
        try:
            if single_image_mode:
                # Single image vs average embedding
                emb1 = get_embedding(read_image(a))
                emb2 = people_embeddings.get(b)
                if emb1 is None or emb2 is None:
                    print(f"⚠️ Missing embeddings for {a} or {b}")
                    continue
            else:
                # Average vs average embedding
                emb1 = people_embeddings.get(a)
                emb2 = people_embeddings.get(b)
                if emb1 is None or emb2 is None:
                    print(f"⚠️ Missing embeddings for {a} or {b}")
                    continue

            sim, pred = compare_embeddings(emb1, emb2)
            y_true.append(label)
            y_pred.append(pred)

            print(f"\nCompare {a} <--> {b}")
            print(f"  Similarity: {sim:.4f}")
            print(f"  Ground Truth: {label} | Prediction: {pred} "
                  f"{'✅ Correct' if pred == label else '❌ Wrong'}")

        except Exception as e:
            print(f"⚠️ Error comparing {a} and {b}: {e}")
            continue

    # Compute metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    print("\n📊 Evaluation Results")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")

# =====================
# MAIN SCRIPT
# =====================
if __name__ == "__main__":
    # Dataset: each folder contains images of one person
    dataset = {
        "person1": ["dataset/person1_img1.jpeg", "dataset/person1_img2.jpeg", "dataset/person1_img3.jpeg"],
        "person2": ["dataset/person2_img1.jpeg", "dataset/person2_img2.jpeg", "dataset/person2_img3.jpeg"],
        "person3": ["dataset/person3_img1.jpeg", "dataset/person3_img2.jpeg", "dataset/person3_img3.jpeg"],
        "person4": ["dataset/person4_img1.jpeg", "dataset/person4_img2.jpeg", "dataset/person4_img3.jpeg"]
    }

    # Build average embeddings for each person
    people_embeddings = {p: get_average_embedding(imgs) for p, imgs in dataset.items()}

    # -----------------
    # 1️⃣ Average vs Average
    # -----------------
    print("\n===== Average vs Average Evaluation =====")
    test_pairs_avg = [
        ("person1", "person1", 1),
        ("person1", "person2", 0),
        ("person2", "person2", 1),
        ("person2", "person1", 0),
        ("person1", "person3", 0),
        ("person2", "person3", 0),
        ("person3", "person3", 1),
        ("person3", "person1", 0),
        ("person3", "person2", 0),
        ("person4", "person4", 1),
        ("person4", "person1", 0),
        ("person4", "person2", 0),
        ("person4", "person3", 0)
    ]
    evaluate_embeddings(people_embeddings, test_pairs_avg, single_image_mode=False)

    # -----------------
    # 2️⃣ Single Image vs Average
    # -----------------
    print("\n===== Single Image vs Average Evaluation =====")
    test_pairs_single = [
        ("dataset/person1_img2.jpeg", "person1", 1),  # same person
        ("dataset/person2_img1.jpeg", "person1", 0),
        ("dataset/person1_img3.jpeg","person1",1),
        ("dataset/person2_img2.jpeg","person2",1),
        ("dataset/person3_img1.jpeg","person3",1),
        ("dataset/person3_img2.jpeg","person3",1),
        ("dataset/person3_img3.jpeg","person3",1),
        ("dataset/person1_img1.jpeg","person3",0),
        ("dataset/person2_img3.jpeg","person3",0),
        ("dataset/person4_img1.jpeg","person4",1),
        ("dataset/person4_img2.jpeg","person4",1),
        ("dataset/person4_img3.jpeg","person4",1),
        ("dataset/person1_img2.jpeg","person4",0),
        ("dataset/person2_img1.jpeg","person4",0),
        ("dataset/person3_img2.jpeg","person4",0)
        
    ]
    evaluate_embeddings(people_embeddings, test_pairs_single, single_image_mode=True)
