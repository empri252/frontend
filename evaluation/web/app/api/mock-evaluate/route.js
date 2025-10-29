import { writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageName, predictionsFile } = await request.json();
    
    const projectRoot = path.join(process.cwd(), '..');
    const outputDir = path.join(projectRoot, 'output');
    const testDataDir = path.join(projectRoot, 'test_data');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Get list of test images
    let testFiles = [];
    if (existsSync(testDataDir)) {
      const allFiles = await readdir(testDataDir);
      testFiles = allFiles.filter(f => f.endsWith('.tif') || f.endsWith('.tiff'));
    }
    
    if (testFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No test images found. Please upload images first.'
      }, { status: 400 });
    }
    
    console.log(`Generating mock evaluation for ${testFiles.length} images...`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock predictions.csv
    const classes = ['cloud', 'haze', 'smoke', 'clear'];
    let predictionsCSV = 'filename,predicted_class,confidence\n';
    
    testFiles.forEach(filename => {
      const predictedClass = classes[Math.floor(Math.random() * classes.length)];
      const confidence = (0.7 + Math.random() * 0.3).toFixed(4); // 0.7 to 1.0
      predictionsCSV += `${filename},${predictedClass},${confidence}\n`;
    });
    
    await writeFile(
      path.join(outputDir, predictionsFile || 'predictions.csv'),
      predictionsCSV
    );
    
    // Generate mock timing_results.json
    const totalTime = 5.5 + Math.random() * 2; // 5.5 to 7.5 seconds
    const timeToFirst = 1.2 + Math.random() * 0.3;
    const timeToLast = totalTime - 0.5;
    
    const timingData = {
      model_name: imageName || 'satellite-classifier:latest',
      num_test_files: testFiles.length,
      full_evaluation: {
        total_time: totalTime.toFixed(2),
        time_to_first_prediction: timeToFirst.toFixed(2),
        time_to_last_prediction: timeToLast.toFixed(2),
        throughput: (testFiles.length / timeToLast).toFixed(2)
      },
      details: {
        container_startup_time: (Math.random() * 0.5 + 0.3).toFixed(2),
        model_load_time: (Math.random() * 0.4 + 0.5).toFixed(2),
        inference_time: (timeToLast - timeToFirst).toFixed(2)
      }
    };
    
    await writeFile(
      path.join(outputDir, 'timing_results.json'),
      JSON.stringify(timingData, null, 2)
    );
    
    // Generate mock eval_result.csv
    const f1Score = (0.85 + Math.random() * 0.12).toFixed(4); // 0.85 to 0.97
    const numParams = Math.floor(20000000 + Math.random() * 5000000); // 20M to 25M
    
    const evalCSV = `weighted_f1_score,num_parameters,accuracy,precision,recall\n${f1Score},${numParams},${(parseFloat(f1Score) + 0.02).toFixed(4)},${(parseFloat(f1Score) + 0.01).toFixed(4)},${(parseFloat(f1Score) - 0.01).toFixed(4)}\n`;
    
    await writeFile(
      path.join(outputDir, 'eval_result.csv'),
      evalCSV
    );
    
    console.log('Mock evaluation complete!');
    
    // Generate mock output log
    const output = `==========================================
Complete Docker Evaluation Pipeline
==========================================
Image: ${imageName || 'satellite-classifier:latest'}
Predictions file: ${predictionsFile || 'predictions.csv'}

Step 1/2: Running Docker evaluation...
Loading model...
Processing ${testFiles.length} images...
${testFiles.map((f, i) => `  [${i+1}/${testFiles.length}] ${f}`).join('\n')}
Evaluation complete

Step 2/2: Computing metrics...
Computing F1 score...
Counting parameters...
Metrics computed

==========================================
EVALUATION RESULTS
==========================================
Model Name: ${imageName || 'satellite-classifier:latest'}
Number of Test Images: ${testFiles.length}
Throughput: ${timingData.full_evaluation.throughput} files/second
Weighted F1 Score: ${f1Score}
Model Size: ${numParams.toLocaleString()} parameters
==========================================`;

    return NextResponse.json({
      success: true,
      output,
      message: 'Mock evaluation completed successfully'
    });
    
  } catch (error) {
    console.error('Mock evaluation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}