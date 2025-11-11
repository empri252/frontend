import os
import csv
import numpy as np
import tensorflow as tf
from PIL import Image

# ==============================================================
# 📦 Paths and environment variables
# ==============================================================
MODEL_PATH = os.environ.get("MODEL_PATH", "/app/weights/mobilenettest1.h5")
TEST_DIR = os.environ.get("TEST_DIR", "/data/test")
OUTPUT_CSV = os.environ.get("OUTPUT_CSV", "/data/output/predictions.csv")

# ==============================================================
# 🧠 Load trained model
# ==============================================================
print(f"🔹 Loading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH)

# Get model input size dynamically
height, width = model.input_shape[1], model.input_shape[2]
print(f"✅ Model input size: {width}x{height}")

# ==============================================================
# 🔢 Class mapping
# ==============================================================
CLASS_MAP = {
    "haze": 0,
    "normal": 1,
    "smoke": 2
}

# ==============================================================
# 🧩 Infer actual class from filename or folder name
# ==============================================================
def infer_actual_class(filepath):
    """Infer actual class from filename or parent folder name."""
    name = filepath.lower()
    # Try folder name first
    folder_name = os.path.basename(os.path.dirname(filepath)).lower()
    for key, value in CLASS_MAP.items():
        if key in folder_name or key in name:
            return value
    # Default fallback: assume 'normal'
    return CLASS_MAP["normal"]

# ==============================================================
# 🧼 Preprocessing function
# ==============================================================
def preprocess(img_path):
    """Load, resize, normalize an image."""
    img = Image.open(img_path).convert("RGB")
    img = img.resize((width, height))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

# ==============================================================
# 🔍 Find all .tif images recursively
# ==============================================================
print(f"🔹 Searching for .tif files in: {TEST_DIR}")
tif_files = []
for root, _, files in os.walk(TEST_DIR):
    for f in files:
        if f.lower().endswith(".tif"):
            tif_files.append(os.path.join(root, f))

if not tif_files:
    print(f"❌ No .tif files found in {TEST_DIR}")
    exit(1)

print(f"✅ Found {len(tif_files)} .tif files for inference")

# ==============================================================
# 🧾 Run inference and save predictions
# ==============================================================
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

with open(OUTPUT_CSV, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["file_name", "predicted_class", "actual_class"])

    for filepath in sorted(tif_files):
        filename = os.path.basename(filepath)
        try:
            x = preprocess(filepath)
            pred = model.predict(x, verbose=0)
            predicted_class = int(np.argmax(pred, axis=1)[0])
            actual_class = infer_actual_class(filepath)
            writer.writerow([filename, predicted_class, actual_class])
            print(f"✅ Processed: {filename} → Pred: {predicted_class}, Actual: {actual_class}")
        except Exception as e:
            print(f"⚠️ Skipped {filename}: {e}")

print(f"\n✅ All predictions saved to: {OUTPUT_CSV}")
