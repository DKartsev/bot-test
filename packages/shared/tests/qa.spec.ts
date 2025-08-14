import { describe, it, expect } from 'vitest';
import { QAEntrySchema } from '../src/models/qa';

describe('QAEntrySchema', () => {
  it('should validate a correct QA entry', () => {
    const qaEntry = {
      id: '1',
      question: 'What is the meaning of life?',
      answer: '42',
      lang: 'en',
      vars: ['a', 'b'],
      status: 'approved',
    };
    const result = QAEntrySchema.safeParse(qaEntry);
    expect(result.success).toBe(true);
  });

  it('should fail validation if id is missing', () => {
    const qaEntry = {
      question: 'What is the meaning of life?',
      answer: '42',
    };
    const result = QAEntrySchema.safeParse(qaEntry);
    expect(result.success).toBe(false);
  });

  it('should fail validation if status is invalid', () => {
    const qaEntry = {
      id: '1',
      question: 'What is the meaning of life?',
      answer: '42',
      status: 'invalid-status',
    };
    const result = QAEntrySchema.safeParse(qaEntry);
    expect(result.success).toBe(false);
  });
});
