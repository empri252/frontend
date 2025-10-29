import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { imageName, predictionsFile } = await request.json();
    
    const projectRoot = path.join(process.cwd(), '..');
    const scriptPath = path.join(projectRoot, 'scripts', 'complete_evaluation.sh');
    
    console.log('Starting evaluation...');
    console.log('Image:', imageName || 'default');
    console.log('Predictions file:', predictionsFile || 'default');

    // Execute the script with increased timeout
    const { stdout, stderr } = await execAsync(
      `bash "${scriptPath}" "${imageName || ''}" "${predictionsFile || ''}"`,
      { 
        cwd: path.join(projectRoot, 'scripts'),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env }
      }
    );
    
    console.log('Evaluation completed successfully');

    return NextResponse.json({ 
      success: true, 
      output: stdout,
      stderr: stderr || ''
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stderr: error.stderr || '',
      stdout: error.stdout || ''
    }, { status: 500 });
  }
}