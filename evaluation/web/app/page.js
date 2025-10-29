'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Evaluation state
  const [imageName, setImageName] = useState('satellite-classifier:latest');
  const [predictionsFile, setPredictionsFile] = useState('predictions.csv');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationOutput, setEvaluationOutput] = useState('');
  
  // Results state
  const [results, setResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load existing files and results on mount
  useEffect(() => {
    // Don't auto-load on mount - only load after explicit upload
    // loadExistingFiles();
    // loadResults();
  }, []);

  const loadExistingFiles = async () => {
    try {
      const response = await fetch('/api/upload');
      const data = await response.json();
      if (data.success) {
        setUploadedFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadResults = async () => {
    setLoadingResults(true);
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      if (data.success && data.hasResults) {
        setResults(data);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files first');
      return;
    }

    setUploading(true);
    
    // Clear current uploaded files display immediately
    setUploadedFiles([]);
    setResults(null); // Also clear previous results
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Set ONLY the newly uploaded files
        setUploadedFiles(data.files);
        setSelectedFiles([]);
        // Clear the file input
        document.querySelector('input[type="file"]').value = '';
        alert(`Successfully uploaded ${data.files.length} files. Previous files have been replaced.`);
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const runEvaluation = async (useMock = false) => {
    if (uploadedFiles.length === 0) {
      alert('Please upload test images first');
      return;
    }

    setEvaluating(true);
    setEvaluationOutput('Starting evaluation...\n');
    setResults(null);

    try {
      const endpoint = useMock ? '/api/mock-evaluate' : '/api/evaluate';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageName, predictionsFile })
      });

      const data = await response.json();
      
      if (data.success) {
        setEvaluationOutput(data.output);
        // Load results after successful evaluation
        await loadResults();
      } else {
        setEvaluationOutput(`Error: ${data.error}\n\n${data.stderr || ''}`);
      }
    } catch (error) {
      setEvaluationOutput(`Error: ${error.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          Satellite Image Evaluation Pipeline
        </h1>

        {/* Step 1: Upload Images */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Step 1: Upload Test Images
          </h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                accept=".tif,.tiff"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {selectedFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedFiles.length} file(s) selected
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 
                disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Uploading...' : 'Upload Images'}
            </button>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-semibold text-green-800 mb-2">
                  Current Test Images: {uploadedFiles.length} files (previous files replaced)
                </p>
                <div className="max-h-32 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="text-xs text-green-700 truncate">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Run Evaluation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Step 2: Run Evaluation
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Docker Image Name
              </label>
              <input
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                placeholder="satellite-classifier:latest"
                className="w-full border border-gray-300 rounded px-3 py-2 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Predictions CSV Filename
              </label>
              <input
                type="text"
                value={predictionsFile}
                onChange={(e) => setPredictionsFile(e.target.value)}
                placeholder="predictions.csv"
                className="w-full border border-gray-300 rounded px-3 py-2
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => runEvaluation(true)}
              disabled={evaluating || uploadedFiles.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 
                disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {evaluating ? 'Running Evaluation...' : 'Run Mock Evaluation'}
            </button>
            
            <button
              onClick={() => runEvaluation(false)}
              disabled={evaluating || uploadedFiles.length === 0}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 
                disabled:bg-gray-400 disabled:cursor-not-allowed transition ml-3"
            >
              {evaluating ? 'Running Evaluation...' : 'Run Real Evaluation (Shell)'}
            </button>
          </div>

          {evaluationOutput && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-gray-800">Evaluation Log:</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto 
                max-h-64 text-xs font-mono">
                {evaluationOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Step 3: View Results */}
        {results?.hasResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Step 3: Evaluation Results
            </h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <MetricCard 
                label="Model Name" 
                value={results.metrics.modelName} 
              />
              <MetricCard 
                label="Test Images" 
                value={results.metrics.numImages} 
              />
              <MetricCard 
                label="Throughput" 
                value={`${results.metrics.throughput} files/sec`} 
              />
              <MetricCard 
                label="F1 Score" 
                value={parseFloat(results.metrics.f1Score).toFixed(4)}
                highlight={true}
              />
              <MetricCard 
                label="Parameters" 
                value={parseInt(results.metrics.numParameters).toLocaleString()} 
              />
            </div>

            {/* Timing Details */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-800 text-lg">Timing Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  label="Total Time" 
                  value={`${parseFloat(results.metrics.totalTime).toFixed(2)}s`} 
                />
                <MetricCard 
                  label="Time to First Prediction" 
                  value={`${parseFloat(results.metrics.timeToFirstPrediction).toFixed(2)}s`} 
                />
                <MetricCard 
                  label="Time to Last Prediction" 
                  value={`${parseFloat(results.metrics.timeToLastPrediction).toFixed(2)}s`} 
                />
              </div>
            </div>

            {/* Predictions Table */}
            {results.predictions && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-800 text-lg">
                  Predictions ({results.predictions.data.length} images)
                </h3>
                <div className="overflow-x-auto max-h-96 border rounded">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {results.predictions.headers.map((header, idx) => (
                          <th 
                            key={idx}
                            className="px-4 py-3 text-left text-xs font-medium 
                              text-gray-700 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.predictions.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {results.predictions.headers.map((header, colIdx) => (
                            <td 
                              key={colIdx}
                              className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                            >
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Download Raw Files */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3 text-gray-800">Download Results</h3>
              <div className="flex gap-3">
                <DownloadButton 
                  filename="eval_result.csv" 
                  content={results.raw.evalCsv}
                />
                {results.raw.predictionsCsv && (
                  <DownloadButton 
                    filename="predictions.csv" 
                    content={results.raw.predictionsCsv}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {!results?.hasResults && !loadingResults && !evaluating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              No results available. Upload images and run evaluation to see results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight = false }) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}

function DownloadButton({ filename, content }) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 
        transition text-sm"
    >
      Download {filename}
    </button>
  );
}