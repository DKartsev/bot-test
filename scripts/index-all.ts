// packages/kb-tools/scripts/index-all.ts
import fs from 'fs';
import path from 'path';
import { indexKB } from '../index';

async function run() {
  const articlesDir = path.resolve(__dirname, '../../apps/support-gateway/kb_articles');
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const md = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
    // предполагаем, что имя файла без .md = UUID статьи
    const articleId = path.basename(file, '.md');
    console.log(`Indexing ${articleId} (${file})…`);
    await indexKB(articleId, md);
  }
  console.log('All articles indexed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
