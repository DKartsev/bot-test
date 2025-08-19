#!/usr/bin/env node

/**
 * Build script for backend only
 * This script is designed to work in production environments like Render
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend-only build...');

try {
  // Build backend with copy build
  console.log('📦 Building backend with copy build...');
  execSync('npm run build:copy -w packages/backend', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Backend build completed successfully!');
  console.log('🚀 Backend is ready for deployment!');
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}
