// vercel-build.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Vercel build process');
console.log('Current directory:', process.cwd());
console.log('Script directory:', __dirname);

// Check for client directory
const clientPath = path.join(process.cwd(), 'client');

if (!fs.existsSync(clientPath)) {
  console.error(`ERROR: Client directory not found at: ${clientPath}`);
  
  // List the current directory to debug
  console.log('Contents of current directory:');
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  } catch (error) {
    console.error('Error listing directory:', error);
  }
  
  process.exit(1);
}

console.log(`Found client directory at: ${clientPath}`);

// Run prepare script for Vercel build
const prepareScriptPath = path.join(clientPath, 'prepare-for-vercel.js');
if (fs.existsSync(prepareScriptPath)) {
  console.log('Running prepare-for-vercel.js script...');
  try {
    process.chdir(clientPath);
    execSync('node prepare-for-vercel.js', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Warning: Error running prepare script:', error.message);
    // Continue with build even if prepare script fails
  }
}

// Run build commands
try {
  // Change to client directory and run build
  console.log(`Changing to client directory: ${clientPath}`);
  process.chdir(clientPath);
  
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Building client...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 