import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

// Detect platform and adjust bash command
const isWindows = process.platform === 'win32';

function getBashCommand() {
  if (!isWindows) return 'bash';
  
  // Use Git Bash on Windows
  return '"C:\\Program Files\\Git\\bin\\bash.exe"';
}

function convertPathForWSL(windowsPath) {
  if (!isWindows) return windowsPath;
  
  // Convert Windows path to WSL path
  // C:\git\project -> /mnt/c/git/project
  const normalized = windowsPath.replace(/\\/g, '/');
  const match = normalized.match(/^([A-Za-z]):\/(.*)/);
  
  if (match) {
    const drive = match[1].toLowerCase();
    const path = match[2];
    return `/mnt/${drive}/${path}`;
  }
  
  return normalized;
}

export async function POST(request) {
  try {
    const { imageName, predictionsFile } = await request.json();
    
    const projectRoot = path.join(process.cwd(), '..');
    const scriptPath = path.join(projectRoot, 'scripts', 'complete_evaluation.sh');
    const scriptsDir = path.join(projectRoot, 'scripts');
    
    console.log('Starting evaluation...');
    console.log('Platform:', process.platform);
    console.log('Image:', imageName || 'default');
    console.log('Predictions file:', predictionsFile || 'default');

    const bashCmd = getBashCommand();
    console.log('Using bash command:', bashCmd);
    
    // On Windows, convert backslashes to forward slashes for bash
    const bashScriptPath = isWindows ? scriptPath.replace(/\\/g, '/') : scriptPath;
    
    const command = `${bashCmd} "${bashScriptPath}" "${imageName || ''}" "${predictionsFile || ''}"`;
    
    console.log('Full command:', command);
    console.log('Working directory:', scriptsDir);

    // Execute the script with increased timeout
    const { stdout, stderr } = await execAsync(command, { 
      cwd: scriptsDir,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 600000, // 10 minutes timeout
      env: { ...process.env }
    });
    
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