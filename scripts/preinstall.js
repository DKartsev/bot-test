const major = parseInt(process.versions.node.split('.')[0], 10);
if (major < 18 || major >= 23) {
  console.error(`Unsupported Node.js version ${process.versions.node}. Please use Node >=18.18 <23.`);
  process.exit(1);
}
