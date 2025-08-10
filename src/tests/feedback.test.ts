import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('classifySentiment', () => {
  let classifySentiment: any;
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../feedback/engine');
    classifySentiment = mod.classifySentiment;
  });

  it('detects positive sentiment', async () => {
    const res = await classifySentiment('I love this great product');
    expect(res).toEqual({ positive: true, negative: false, neutral: false });
  });

  it('detects negative sentiment', async () => {
    const res = await classifySentiment('This is the worst, I hate it');
    expect(res).toEqual({ positive: false, negative: true, neutral: false });
  });

  it('treats empty text as neutral', async () => {
    const res = await classifySentiment('');
    expect(res).toEqual({ positive: false, negative: false, neutral: true });
  });
});

describe('ingestLine and recomputeAll', () => {
  let engine: any;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-'));
    process.env.FEEDBACK_LOG_PATH = path.join(tmpDir, 'log.jsonl');
    process.env.FEEDBACK_METRICS_PATH = path.join(tmpDir, 'metrics.json');
    vi.resetModules();
    engine = await import('../feedback/engine');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.FEEDBACK_LOG_PATH;
    delete process.env.FEEDBACK_METRICS_PATH;
  });

  it('classifies and aggregates sentiments', async () => {
    await engine.ingestLine({ itemId: '1', comment: 'Amazing answer', source: 'test', lang: 'en', ts: '2024-01-01T00:00:00Z' });
    await engine.ingestLine({ itemId: '1', comment: 'Awful response', source: 'test', lang: 'en', ts: '2024-01-02T00:00:00Z' });
    await engine.ingestLine({ itemId: '2', comment: '', source: 'test', lang: 'en', ts: '2024-01-03T00:00:00Z' });

    const snapshot = await engine.recomputeAll();
    expect(snapshot.totals).toEqual({ total: 3, pos: 1, neg: 1, neu: 1 });
    expect(snapshot.items['1'].pos).toBe(1);
    expect(snapshot.items['1'].neg).toBe(1);
    expect(snapshot.items['2'].neu).toBe(1);
  });
});
