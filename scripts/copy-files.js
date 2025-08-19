#!/usr/bin/env node

/**
 * Script to copy source files without TypeScript compilation
 * This is a temporary solution for deployment issues
 */

const fs = require('fs');
const path = require('path');

function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      // Recursively copy directories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const srcDir = path.join(__dirname, '..', 'packages', 'backend', 'src');
  const distDir = path.join(__dirname, '..', 'packages', 'backend', 'dist');

  console.log('🚀 Starting file copy build...');
  console.log(`📁 Source: ${srcDir}`);
  console.log(`📁 Destination: ${distDir}`);

  try {
    // Clean destination directory
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }

    // Copy files
    copyDirectory(srcDir, distDir);

    console.log('✅ File copy completed successfully!');
    console.log('📦 Backend is ready for deployment');
  } catch (error) {
    console.error('❌ File copy failed:', error.message);
    process.exit(1);
  }
}

main();
