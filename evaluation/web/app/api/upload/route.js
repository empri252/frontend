import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Path to test_data directory (go up from web/)
    const projectRoot = path.join(process.cwd(), '..');
    const testDataDir = path.join(projectRoot, 'test_data');

    // ALWAYS clear existing test_data directory on new upload
    if (existsSync(testDataDir)) {
      const existingFiles = await readdir(testDataDir);
      console.log(`Clearing ${existingFiles.length} existing files from test_data`);
      await Promise.all(
        existingFiles.map(file => 
          unlink(path.join(testDataDir, file)).catch(() => {})
        )
      );
    } else {
      await mkdir(testDataDir, { recursive: true });
    }
    
    console.log('test_data directory cleared, ready for new files');

    // Save uploaded files
    const savedFiles = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Validate file extension
      if (!file.name.endsWith('.tif') && !file.name.endsWith('.tiff')) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${file.name}. Only .tif files allowed.` },
          { status: 400 }
        );
      }

      const filePath = path.join(testDataDir, file.name);
      await writeFile(filePath, buffer);
      savedFiles.push(file.name);
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${savedFiles.length} files`,
      files: savedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Get current test images
export async function GET() {
  try {
    const projectRoot = path.join(process.cwd(), '..');
    const testDataDir = path.join(projectRoot, 'test_data');

    if (!existsSync(testDataDir)) {
      return NextResponse.json({
        success: true,
        files: []
      });
    }

    const files = await readdir(testDataDir);
    const tifFiles = files.filter(f => f.endsWith('.tif') || f.endsWith('.tiff'));

    return NextResponse.json({
      success: true,
      files: tifFiles,
      count: tifFiles.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}