import { loadFaq } from './store.js';

const faq = loadFaq();
const ids = new Set<string>();
const errors: string[] = [];
for (const f of faq) {
  if (!f.id || !f.q || !f.a) {
    errors.push(`Invalid entry: ${JSON.stringify(f)}`);
  }
  if (ids.has(f.id)) {
    errors.push(`Duplicate id: ${f.id}`);
  }
  ids.add(f.id);
}

if (errors.length) {
  // Use stderr without importing logger to keep this script lightweight
  process.stderr.write(`FAQ validation failed:\n${errors.join('\n')}\n`);
  process.exit(1);
} else {
  process.stdout.write(`FAQ valid. Entries: ${faq.length}\n`);
}
