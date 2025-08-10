if (process.env.NODE_ENV === 'production') {
  console.log('[preinstall] skipping script in production environment');
  process.exit(0);
}

console.log('[preinstall] no-op script for non-production environments');
