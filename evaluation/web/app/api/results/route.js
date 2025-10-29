import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const projectRoot = path.join(process.cwd(), '..');
    const outputDir = path.join(projectRoot, 'output');
    
    // Paths to output files
    const timingPath = path.join(outputDir, 'timing_results.json');
    const evalPath = path.join(outputDir, 'eval_result.csv');
    const predictionsPath = path.join(outputDir, 'predictions.csv');

    // Check if files exist
    if (!existsSync(timingPath) || !existsSync(evalPath)) {
      return NextResponse.json({
        success: true,
        hasResults: false,
        message: 'No evaluation results found. Run evaluation first.'
      });
    }

    // Read all result files
    const timingData = JSON.parse(await readFile(timingPath, 'utf-8'));
    const evalCsv = await readFile(evalPath, 'utf-8');
    
    let predictionsCsv = null;
    if (existsSync(predictionsPath)) {
      predictionsCsv = await readFile(predictionsPath, 'utf-8');
    }

    // Parse CSV files for easier frontend consumption
    const parseCSV = (csv) => {
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index]?.trim();
          return obj;
        }, {});
      });
      return { headers, data };
    };

    const evalResult = parseCSV(evalCsv);
    const predictionsResult = predictionsCsv ? parseCSV(predictionsCsv) : null;

    // Extract key metrics
    const metrics = {
      modelName: timingData.model_name || 'N/A',
      numImages: timingData.num_test_files || 0,
      throughput: timingData.full_evaluation?.time_to_last_prediction 
        ? (timingData.num_test_files / timingData.full_evaluation.time_to_last_prediction).toFixed(2)
        : 'N/A',
      f1Score: evalResult.data[0]?.weighted_f1_score || 'N/A',
      numParameters: evalResult.data[0]?.num_parameters || 'N/A',
      totalTime: timingData.full_evaluation?.total_time || 'N/A',
      timeToFirstPrediction: timingData.full_evaluation?.time_to_first_prediction || 'N/A',
      timeToLastPrediction: timingData.full_evaluation?.time_to_last_prediction || 'N/A',
    };

    return NextResponse.json({
      success: true,
      hasResults: true,
      metrics,
      timing: timingData,
      evaluation: evalResult,
      predictions: predictionsResult,
      raw: {
        evalCsv,
        predictionsCsv
      }
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}