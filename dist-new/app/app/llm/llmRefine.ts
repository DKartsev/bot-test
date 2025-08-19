import type { FastifyBaseLogger } from 'fastify';
import OpenAI from 'openai';
import { z } from 'zod';

const ResultSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  escalate: z.boolean(),
  citations: z.array(z.object({ id: z.string() })).default([]),
});

export type RefineResult = z.infer<typeof ResultSchema>;

export async function refineDraft(
  question: string,
  draft: string,
  sources: Array<{ id: string; title?: string; excerpt?: string }>,
  lang: string,
  logger: FastifyBaseLogger,
): Promise<RefineResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? '',
  });

  const systemPrompt = `You are a helpful AI assistant. Your task is to refine a draft answer based on the provided sources and question.

Question: ${question}
Draft answer: ${draft}
Sources: ${JSON.stringify(sources, null, 2)}

Please provide a refined answer that:
1. Directly addresses the question
2. Incorporates relevant information from the sources
3. Is clear, concise, and well-structured
4. Is in the language: ${lang}

Return your response in the following JSON format:
{
  "answer": "your refined answer here",
  "confidence": 0.95,
  "escalate": false,
  "citations": [{"id": "source_id"}]
}

Confidence should be between 0 and 1. Set escalate to true if you're not confident in the answer or if the question requires human intervention.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please refine the draft answer.' },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const result = JSON.parse(content) as RefineResult;

    logger.info(
      { confidence: result.confidence, escalate: result.escalate },
      'Draft refined successfully',
    );

    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to refine draft');
    throw new Error('Failed to refine draft answer');
  }
}
