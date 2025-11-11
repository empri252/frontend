#!/bin/bash
# ==========================================================
# 🛰️ Complete Evaluation Pipeline
# 1️⃣ Runs Docker inference
# 2️⃣ Computes evaluation metrics
# ==========================================================

set -e  # Exit immediately if any command fails

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🧠 Satellite Model Evaluation System"
echo "=========================================================="
echo "Skipping virtual environment activation (Docker handles env)..."
echo ""

# ==========================================================
# 🔹 Paths (host machine)
# ==========================================================
TEST_DATA_PATH="C:/Users/Issac/Downloads/HacX/test"
OUTPUT_PATH="../output"
WEIGHTS_PATH="../weights"

# ==========================================================
# 🔹 Ask for image name and prediction file
# ==========================================================
if [ -z "$1" ]; then
    read -p "Enter Docker image name (default: satellite-classifier:latest): " IMAGE_NAME
    IMAGE_NAME="${IMAGE_NAME:-satellite-classifier:latest}"
    
    read -p "Enter predictions CSV filename (default: predictions.csv): " PREDICTIONS_FILE
    PREDICTIONS_FILE="${PREDICTIONS_FILE:-predictions.csv}"
else
    IMAGE_NAME="$1"
    PREDICTIONS_FILE="${2:-predictions.csv}"
fi

echo ""
echo "=========================================================="
echo "Running Complete Docker Evaluation"
echo "=========================================================="
echo "Docker Image:      $IMAGE_NAME"
echo "Predictions file:  $PREDICTIONS_FILE"
echo "Test data folder:  $TEST_DATA_PATH"
echo ""

# ==========================================================
# 🔹 Step 1 — Run Docker Evaluation (Inference)
# ==========================================================
echo "Step 1/2: Running Docker inference on test data..."
python run_docker_evaluation.py \
    --image "$IMAGE_NAME" \
    --test-data "$TEST_DATA_PATH" \
    --output "$OUTPUT_PATH" \
    --weights "$WEIGHTS_PATH" \
    --predictions-file "$PREDICTIONS_FILE"
echo "✅ Inference complete."
echo ""

# ==========================================================
# 🔹 Step 2 — Compute Metrics (F1, Params)
# ==========================================================
echo "Step 2/2: Computing metrics..."
python compute_metrics.py \
    --predictions "$OUTPUT_PATH/$PREDICTIONS_FILE" \
    --weights "$WEIGHTS_PATH" \
    --output "$OUTPUT_PATH/eval_result.csv"
echo "✅ Metrics computed."
echo ""

# ==========================================================
# 🔹 Display Results Summary
# ==========================================================
echo ""
echo "=========================================================="
echo "📊 EVALUATION RESULTS"
echo "=========================================================="

MODEL_NAME=$(python -c "import json; print(json.load(open('../output/timing_results.json')).get('model_name', 'N/A'))" 2>/dev/null || echo "N/A")
NUM_IMAGES=$(python -c "import json; print(json.load(open('../output/timing_results.json')).get('num_test_files', 'N/A'))" 2>/dev/null || echo "N/A")
THROUGHPUT=$(python -c "import json; d=json.load(open('../output/timing_results.json')); print(f\"{d['num_test_files']/d['full_evaluation']['time_to_last_prediction']:.2f}\")" 2>/dev/null || echo "N/A")
F1_SCORE=$(python -c "import pandas as pd; print(f\"{pd.read_csv('../output/eval_result.csv')['weighted_f1_score'].iloc[0]:.4f}\")" 2>/dev/null || echo "N/A")
NUM_PARAMS=$(python -c "import pandas as pd; print(f\"{int(pd.read_csv('../output/eval_result.csv')['num_parameters'].iloc[0]):,}\")" 2>/dev/null || echo "N/A")

echo "Model Name:          $MODEL_NAME"
echo "Number of Test Images: $NUM_IMAGES"
echo "Throughput:          $THROUGHPUT files/second"
echo "Weighted F1 Score:   $F1_SCORE"
echo "Model Size:          $NUM_PARAMS parameters"
echo "=========================================================="
echo "✅ Results saved to: $OUTPUT_PATH/"
echo "=========================================================="
