#!/usr/bin/env python3
"""
🛰️ Docker-based Satellite Model Evaluation
------------------------------------------
1️⃣ Recursively finds all .tif files in the test directory
2️⃣ Runs your Docker container for inference
3️⃣ Monitors timing and writes results to timing_results.json
"""

import os
import sys
import json
import time
import argparse
import subprocess

# ==========================================================
# 🧩 Helpers
# ==========================================================
def to_docker_path(path: str) -> str:
    r"""Convert Windows-style path (e.g. C:\Users\...) → /c/Users/..."""
    path = os.path.abspath(path)
    if ":" in path:
        drive, tail = path.split(":", 1)
        tail = tail.replace("\\", "/")
        return f"/{drive.lower()}{tail}"
    return path.replace("\\", "/")

def find_tif_files(test_dir: str):
    """Recursively find .tif files in test folder (handles nested folders)."""
    tif_files = []
    for root, _, files in os.walk(test_dir):
        for f in files:
            if f.lower().endswith(".tif"):
                tif_files.append(os.path.join(root, f))
    return sorted(tif_files)

# ==========================================================
# ⚙️ Main
# ==========================================================
def main():
    parser = argparse.ArgumentParser(description="Run Docker-based model evaluation and measure inference time.")
    parser.add_argument("--image", required=True, help="Docker image name (e.g., satellite-classifier:latest)")
    parser.add_argument("--test-data", required=True, help="Folder containing .tif files or subfolders")
    parser.add_argument("--output", required=True, help="Output directory for results")
    parser.add_argument("--weights", required=True, help="Directory containing model weights (.h5)")
    parser.add_argument("--predictions-file", default="predictions.csv", help="Predictions CSV filename")
    args = parser.parse_args()

    image_name = args.image
    test_dir = os.path.abspath(args.test_data)
    output_dir = os.path.abspath(args.output)
    weights_dir = os.path.abspath(args.weights)
    predictions_file = args.predictions_file

    print("=" * 70)
    print("DOCKER EVALUATION SETUP")
    print("=" * 70)

    # ------------------------------------------------------
    # 🧠 Check Docker
    # ------------------------------------------------------
    try:
        docker_ver = subprocess.check_output(["docker", "--version"], text=True).strip()
        print(f"Docker found: {docker_ver}")
    except Exception:
        print("❌ Docker not found — please start Docker Desktop and try again.")
        sys.exit(1)

    # ------------------------------------------------------
    # 🧱 Check Docker image
    # ------------------------------------------------------
    if subprocess.run(["docker", "image", "inspect", image_name],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        print(f"❌ Docker image '{image_name}' not found.")
        print(f"   To build it, run:")
        print(f"   docker build -t {image_name} ./app")
        sys.exit(1)
    else:
        print(f"Docker image '{image_name}' found ✅")

    # ------------------------------------------------------
    # 🔍 Find .tif files (recursively)
    # ------------------------------------------------------
    tif_files = find_tif_files(test_dir)
    if not tif_files:
        print(f"❌ No .tif files found in {test_dir} (including subfolders).")
        sys.exit(1)
    print(f"✅ Found {len(tif_files)} .tif files for inference")

    os.makedirs(output_dir, exist_ok=True)

    # ------------------------------------------------------
    # 🐳 Run Docker container
    # ------------------------------------------------------
    print("\nStarting Docker inference...")
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{to_docker_path(test_dir)}:/data/test:ro",
        "-v", f"{to_docker_path(weights_dir)}:/app/weights:ro",
        "-v", f"{to_docker_path(output_dir)}:/data/output",
        "-e", "MODEL_PATH=/app/weights/mobilenettest1.h5",
        "-e", "TEST_DIR=/data/test",
        "-e", f"OUTPUT_CSV=/data/output/{predictions_file}",
        image_name,
    ]

    print("Running command:")
    print(" ".join(docker_cmd))
    print("------------------------------------------------------")

    start_time = time.time()
    try:
        subprocess.run(docker_cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Docker run failed:\n{e.stderr or e}")
        sys.exit(1)
    end_time = time.time()
    total_time = round(end_time - start_time, 2)

    # ------------------------------------------------------
    # 🧮 Write timing info
    # ------------------------------------------------------
    timing_data = {
        "image_name": image_name,
        "model_name": os.path.basename(weights_dir),
        "num_test_files": len(tif_files),
        "full_evaluation": {
            "total_time": total_time,
            "time_to_last_prediction": total_time
        }
    }

    timing_path = os.path.join(output_dir, "timing_results.json")
    with open(timing_path, "w") as f:
        json.dump(timing_data, f, indent=4)

    print(f"\n✅ Inference complete in {total_time:.2f}s")
    print(f"Results saved to: {timing_path}")
    print("=" * 70)


# ==========================================================
# 🚀 Entry point
# ==========================================================
if __name__ == "__main__":
    main()
