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

def read_image(path):
    """Load image (BGR->RGB)"""
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


def cosine_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))


# =====================
# TESTING LOOP
# =====================
def evaluate(dataset_pairs):
    """
    dataset_pairs: list of tuples (img1_path, img2_path, label)
        label = 1 if same person, 0 if different person
    """
    y_true, y_pred = [], []

    for img1, img2, label in dataset_pairs:
        emb1 = get_embedding(read_image(img1))
        emb2 = get_embedding(read_image(img2))

        if emb1 is None or emb2 is None:
            print(f"⚠️ Skipping pair ({img1}, {img2}) - no face detected")
            continue

        sim = cosine_similarity(emb1, emb2)
        prediction = 1 if sim >= SIMILARITY_THRESHOLD else 0

        y_true.append(label)
        y_pred.append(prediction)

        # ✅ Print predictions
        print(f"\nPair: {img1} <--> {img2}")
        print(f"  Similarity: {sim:.4f}")
        print(f"  Ground Truth: {label} | Prediction: {prediction} "
              f"{'✅ Correct' if prediction == label else '❌ Wrong'}")

    # =====================
    # METRICS
    # =====================
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    print("\n📊 Evaluation Results")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")



if __name__ == "__main__":
    # Example ground-truth dataset
    dataset_pairs = [
        # Same person (label=1)
        ("dataset/person1_img1.jpeg", "dataset/person1_img2.jpeg", 1),
        #("dataset/person2_img1.jpeg", "dataset/person2_img2.jpeg", 1),
        ("dataset/person3_img1.jpeg", "dataset/person3_img2.jpeg", 1),
        ("dataset/person4_img1.jpeg", "dataset/person4_img3.jpeg", 1),
        #("dataset/person2_img1.jpeg", "dataset/person2_img3.jpeg", 1),
        ("dataset/person3_img1.jpeg", "dataset/person3_img3.jpeg", 1),
        ("dataset/person1_img2.jpeg", "dataset/person1_img3.jpeg", 1),
        ("dataset/person4_img2.jpeg", "dataset/person4_img3.jpeg", 1),
        #("dataset/person2_img2.jpeg", "dataset/person2_img3.jpeg", 1),
        ("dataset/person3_img2.jpeg", "dataset/person3_img3.jpeg", 1),
        # Different persons (label=0)
        ("dataset/person1_img1.jpeg", "dataset/person2_img1.jpeg", 0),
        ("dataset/person1_img1.jpeg", "dataset/person3_img1.jpeg", 0),
        ("dataset/person2_img1.jpeg", "dataset/person4_img1.jpeg", 0),
        ("dataset/person3_img1.jpeg", "dataset/person4_img1.jpeg", 0),
        ("dataset/person4_img1.jpeg", "dataset/person1_img2.jpeg", 0),
        ("dataset/person4_img1.jpeg", "dataset/person2_img2.jpeg", 0),
        ("dataset/person1_img1.jpeg", "dataset/person2_img1.jpeg", 0),
        ("dataset/person2_img1.jpeg", "dataset/person3_img1.jpeg", 0),
        ("dataset/person3_img1.jpeg", "dataset/person1_img2.jpeg", 0),
        ("dataset/person3_img1.jpeg", "dataset/person2_img2.jpeg", 0),
        ("dataset/person1_img2.jpeg", "dataset/person2_img2.jpeg", 0),
    ]

    evaluate(dataset_pairs)
