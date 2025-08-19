import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIEmbedder } from './embedder.js';
import { logger } from '../../../utils/logger.js';

// Мок OpenAI определен в src/test/setup.ts
import OpenAI from 'openai';

describe('OpenAIEmbedder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('возвращает корректную размерность', () => {
		const embedder = new OpenAIEmbedder();
		expect(embedder.getDimension()).toBe(1536);
	});

	it('успешно встраивает тексты через OpenAI', async () => {
		const embedder = new OpenAIEmbedder();
		// Получаем инстанс мокнутого OpenAI клиента
		const OpenAIConstructor = (OpenAI as any).mock;
		const instance = OpenAIConstructor.instances[0] as any;
		instance.embeddings.create.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });

		const result = await embedder.embed(['hello']);
		expect(instance.embeddings.create).toHaveBeenCalledWith({
			model: 'text-embedding-ada-002',
			input: ['hello'],
		});
		expect(result).toEqual([[0.1, 0.2]]);
	});

	it('логирует ошибку и пробрасывает исключение при сбое OpenAI', async () => {
		const embedder = new OpenAIEmbedder();
		const OpenAIConstructor = (OpenAI as any).mock;
		const instance = OpenAIConstructor.instances[0] as any;
		instance.embeddings.create.mockRejectedValue(new Error('boom'));

		const spy = (logger as any).error;
		await expect(embedder.embed(['text'])).rejects.toThrow('Embedding creation failed');
		expect(spy).toHaveBeenCalled();
	});
});
