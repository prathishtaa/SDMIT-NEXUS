import cv2
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc
import insightface
from groundtruth import dataset_pairs

# =====================
# Load Face Model
# =====================
app_model = insightface.app.FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app_model.prepare(ctx_id=0, det_size=(640, 640))

SIMILARITY_THRESHOLD = 0.5  # You can adjust or optimize later

# =====================
# Helper Functions
# =====================
def read_image(path):
    img_bgr = cv2.imread(path)
    if img_bgr is None:
        raise ValueError(f"Invalid image: {path}")
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return img_rgb

def get_embedding(img_rgb):
    faces = app_model.get(img_rgb)
    if not faces:
        return None
    emb = faces[0].embedding
    emb = emb / np.linalg.norm(emb)
    return emb

def cosine_similarity(emb1, emb2):
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

# =====================
# Evaluation
# =====================
def evaluate(dataset_pairs, threshold=SIMILARITY_THRESHOLD, title="Evaluation"):
    y_true, y_pred, similarities = [], [], []

    for img1, img2, label in dataset_pairs:
        emb1 = get_embedding(read_image(img1))
        emb2 = get_embedding(read_image(img2))
        if emb1 is None or emb2 is None:
            print(f"⚠️ Skipping pair ({img1}, {img2}) - no face detected")
            continue

        sim = cosine_similarity(emb1, emb2)
        prediction = 1 if sim >= threshold else 0

        y_true.append(label)
        y_pred.append(prediction)
        similarities.append(sim)

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    similarities = np.array(similarities)

    # Metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    FAR = fp / (fp + tn)
    FRR = fn / (fn + tp)

    print(f"\n📊 {title}: Results")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}, Recall: {rec:.4f}, F1 Score: {f1:.4f}")
    print(f"FAR: {FAR:.4f}, FRR: {FRR:.4f}")

    # Similarity histogram
    plt.hist(similarities[y_true==1], bins=30, alpha=0.5, label="Same person")
    plt.hist(similarities[y_true==0], bins=30, alpha=0.5, label="Different person")
    plt.xlabel("Cosine Similarity")
    plt.ylabel("Count")
    plt.title(f"{title} - Similarity Distribution")
    plt.legend()
    plt.show()

    # ROC Curve
    fpr, tpr, _ = roc_curve(y_true, similarities)
    roc_auc = auc(fpr, tpr)
    plt.figure(figsize=(6,6))
    plt.plot(fpr, tpr, label=f"ROC Curve (AUC = {roc_auc:.4f})")
    plt.plot([0,1],[0,1],'k--')
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title(f"{title} - ROC Curve")
    plt.legend()
    plt.grid()
    plt.show()

    # DET Curve
    plt.figure(figsize=(6,6))
    plt.plot(fpr, 1-tpr)
    plt.xlabel("FAR")
    plt.ylabel("FRR")
    plt.title(f"{title} - DET Curve")
    plt.grid()
    plt.show()

    # EER
    diff = np.abs(fpr - (1 - tpr))
    EER_index = np.argmin(diff)
    EER = (fpr[EER_index] + (1 - tpr[EER_index])) / 2
    print(f"EER (Equal Error Rate): {EER:.4f}")


if __name__ == "__main__":
    evaluate(dataset_pairs, title="Dataset Pairs Evaluation without augmented Images")

