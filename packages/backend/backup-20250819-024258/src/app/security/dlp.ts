import type { FSWatcher } from 'fs';
import { promises as fs, watch } from 'fs';
import path from 'path';
import yaml from 'yaml';

import { logger } from '../../utils/logger.js';
import type { Detection } from './patterns.js';
import { detectAll } from './patterns.js';
import { redact } from './redactor.js';

// Define types for policies
interface PolicyRule {
  regex: string;
  _regex?: RegExp;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  block_in?: boolean;
  block_out?: boolean;
}
interface Policies {
  version: number;
  pii?: Record<string, PolicyRule>;
  secrets?: Record<string, PolicyRule>;
  profanity?: Record<string, PolicyRule>;
}

// Module state
let policies: Policies = { version: 0 };
let watcher: FSWatcher | null = null;

const POL_PATH = path.join(process.cwd(), 'data', 'security', 'policies.yaml');

function debounce(fn: () => void, ms: number) {
  let t: NodeJS.Timeout;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

export async function loadPolicies() {
  logger.info('Loading DLP policies...');
  try {
    const text = await fs.readFile(POL_PATH, 'utf8');
    policies = (yaml.parse(text) as Policies) || { version: 0 };
    logger.info({ version: policies.version }, 'DLP policies loaded.');
  } catch (err) {
    logger.error(
      { err, path: POL_PATH },
      'Failed to load DLP policies. DLP will be ineffective.',
    );
    policies = { version: 0 };
  }

  if (watcher) watcher.close();
  try {
    watcher = watch(
      POL_PATH,
      { persistent: false },
      debounce(() => void loadPolicies(), 5000),
    );
    watcher.on('error', (err) =>
      logger.error({ err }, 'DLP policy watcher error.'),
    );
  } catch (err) {
    logger.error(
      { err, path: POL_PATH },
      'Could not start watching DLP policy file.',
    );
  }
}

function shouldBlock(detection: Detection): boolean {
  // Simplified blocking logic for now
  if (detection.type === 'secrets') return true;
  return false;
}

interface ScanResult {
  blocked: boolean;
  detections: Detection[];
}

export function scan(text: string): ScanResult {
  if (!text) return { blocked: false, detections: [] };

  const detections = detectAll(text, policies);
  const blocked = detections.some(shouldBlock);

  if (detections.length) {
    logger.warn(
      { detectionsCount: detections.length, blocked },
      'DLP scan found sensitive data.',
    );
  }

  return { blocked, detections };
}

interface SanitizeResult extends ScanResult {
  text: string;
}

export function sanitize(text: string): SanitizeResult {
  if (!text) return { blocked: false, text, detections: [] };

  const { blocked, detections } = scan(text);
  let redactedText = text;

  if (detections.length) {
    redactedText = redact(text, detections, { style: 'mask' });
  }

  return { blocked, text: redactedText, detections };
}

// Initial load
void loadPolicies();
