import fs from 'fs';
import path from 'path';

import type { KbDoc } from './index.js';
import { logger } from '../utils/logger.js';

export function loadKb(): KbDoc[] {
  try {
    const kbPath = process.env.KB_DIR ?? './data/kb';
    const files = fs.readdirSync(kbPath);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    const docs: KbDoc[] = [];
    
    for (const file of markdownFiles) {
      try {
        const content = fs.readFileSync(path.join(kbPath, file), 'utf8');
        const title = file.replace('.md', '');
        const slug = title.toLowerCase().replace(/\s+/g, '-');
        
        docs.push({
          id: slug,
          title,
          content,
          tags: [],
          slug,
        });
      } catch (err) {
        logger.error({ err, file }, 'Failed to load KB file');
      }
    }
    
    logger.info({ count: docs.length }, 'Loaded KB documents');
    return docs;
  } catch (err) {
    logger.error({ err }, 'Failed to load KB');
    return [];
  }
}
