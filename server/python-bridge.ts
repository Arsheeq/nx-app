import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

// Interface for report generation
interface GenerateReportParams {
  cloudProvider: 'AWS' | 'AZURE';
  reportType: 'utilization' | 'billing';
  credentials: any;
  resources: string[];
  accountName: string;
  frequency?: 'daily' | 'weekly';
  month?: number;
  year?: number;
}

// Main function to generate a report using Python backend
export async function generateReport(params: GenerateReportParams): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Create a temporary directory for storing credentials safely
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cloud-report-'));
    
    // Create temp file for parameters
    const paramsPath = path.join(tempDir, 'params.json');
    await fs.writeFile(paramsPath, JSON.stringify(params), 'utf8');
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore this error
    }
    
    // Execute Python script
    const pythonScript = path.join(process.cwd(), 'python-backend', 'app.py');
    const outputPath = path.join(outputDir, `report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`);
    
    return new Promise((resolve, reject) => {
      exec(
        `python3 "${pythonScript}" --params "${paramsPath}" --output "${outputPath}"`,
        async (error, stdout, stderr) => {
          // Clean up temp files regardless of outcome
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (cleanupErr) {
            console.error('Error cleaning up temp files:', cleanupErr);
          }
          
          if (error) {
            console.error(`Python execution error: ${error.message}`);
            console.error(`stderr: ${stderr}`);
            return resolve({ success: false, error: error.message });
          }
          
          if (stderr) {
            console.warn(`Python stderr: ${stderr}`);
          }
          
          console.log(`Python stdout: ${stdout}`);
          
          try {
            // Check if the output file was created
            await fs.access(outputPath);
            resolve({ success: true, filePath: outputPath });
          } catch (accessErr) {
            resolve({ 
              success: false, 
              error: 'Report generation failed: Output file not created' 
            });
          }
        }
      );
    });
  } catch (err: any) {
    console.error('Error in generate report bridge:', err);
    return { success: false, error: err.message };
  }
}

// Function to call Python API directly for testing
export async function testPythonBackend(): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    exec('python3 python-backend/app.py --test', (error, stdout, stderr) => {
      if (error) {
        console.error(`Python test error: ${error.message}`);
        return reject(error);
      }
      
      let response;
      try {
        response = JSON.parse(stdout);
      } catch (e) {
        response = { status: 'running', message: stdout };
      }
      
      resolve(response);
    });
  });
}
