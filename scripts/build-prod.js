#!/usr/bin/env node

/**
 * Production build script without husky dependencies
 * This script is designed to work in production environments like Render
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting production build...');

try {
  // Build backend
  console.log('📦 Building backend...');
  execSync('npm run build -w packages/backend', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  // Build operator-admin
  console.log('📦 Building operator-admin...');
  execSync('npm run build -w packages/operator-admin', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Production build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
