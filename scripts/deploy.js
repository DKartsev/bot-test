#!/usr/bin/env node

/**
 * Simple deployment script without husky dependencies
 * This script is designed to work in production environments like Render
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting deployment build...');

try {
  // Build backend with copy build
  console.log('📦 Building backend with copy build...');
  execSync('npm run build:copy -w packages/backend', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // Build operator-admin
  console.log('📦 Building operator-admin...');
  execSync('npm run build -w packages/operator-admin', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Deployment build completed successfully!');
  console.log('🚀 Ready for deployment!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
