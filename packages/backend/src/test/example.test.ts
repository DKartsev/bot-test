import { jest, describe, it, expect } from '@jest/globals';

describe('Пример теста', () => {
  it('должен проходить успешно', () => {
    expect(1 + 1).toBe(2);
  });

  it('должен работать с моками', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue('test');
    
    expect(mockFn()).toBe('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
