import { env } from '../config/env';
import { logError, logInfo } from '../utils/logger';
import type { OpenAIConfig, QueryRephraseResult, RefinementResult } from '../types/rag';

export class OpenAIService {
  private config: OpenAIConfig;
  private baseURL: string;

  constructor() {
    this.config = {
      apiKey: env.openai?.apiKey || process.env.OPENAI_API_KEY || '',
      model: env.openai?.model || 'gpt-4o-mini',
      baseURL: env.openai?.baseURL || 'https://api.openai.com/v1',
      maxTokens: env.openai?.maxTokens || 4000,
      temperature: env.openai?.temperature || 0.3,
      timeout: env.openai?.timeout || 30000,
    };
    this.baseURL = this.config.baseURL || 'https://api.openai.com/v1';
  }

  /**
   * Переформулировка запроса пользователя для улучшения поиска
   */
  async rephraseQuery(question: string, context?: string): Promise<QueryRephraseResult> {
    try {
      const prompt = this.buildRephrasePrompt(question, context);
      const response = await this.callOpenAI(prompt, 'rephrase');
      
      return {
        originalQuery: question,
        rephrasedQuery: response.content,
        intent: response.intent || 'general',
        confidence: response.confidence || 0.8,
      };
    } catch (error) {
      logError('Ошибка переформулировки запроса', { error, question });
      // Возвращаем оригинальный запрос в случае ошибки
      return {
        originalQuery: question,
        rephrasedQuery: question,
        intent: 'general',
        confidence: 0.5,
      };
    }
  }

  /**
   * Генерация черновика ответа на основе найденных источников
   */
  async generateDraft(question: string, sources: any[], context?: string): Promise<string> {
    try {
      const prompt = this.buildDraftPrompt(question, sources, context);
      const response = await this.callOpenAI(prompt, 'draft');
      return response.content;
    } catch (error) {
      logError('Ошибка генерации черновика', { error, question });
      return 'Извините, не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.';
    }
  }

  /**
   * Улучшение ответа через RAG
   */
  async refineAnswer(
    question: string, 
    draft: string, 
    sources: any[], 
    context?: string
  ): Promise<RefinementResult> {
    try {
      const prompt = this.buildRefinePrompt(question, draft, sources, context);
      const response = await this.callOpenAI(prompt, 'refine');
      
      return {
        refinedAnswer: response.content,
        confidence: response.confidence || 0.8,
        changes: response.changes || [],
        sourcesUsed: response.sourcesUsed || [],
      };
    } catch (error) {
      logError('Ошибка улучшения ответа', { error, question });
      return {
        refinedAnswer: draft,
        confidence: 0.5,
        changes: ['Ошибка улучшения'],
        sourcesUsed: [],
      };
    }
  }

  /**
   * Вызов OpenAI API
   */
  private async callOpenAI(prompt: string, task: string): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API ключ не настроен');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(task),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API ошибка: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Пустой ответ от OpenAI API');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        // Если не удалось распарсить JSON, возвращаем как текст
        return { content, confidence: 0.7 };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Построение промпта для переформулировки
   */
  private buildRephrasePrompt(question: string, context?: string): string {
    return `Переформулируй вопрос пользователя для улучшения поиска в базе знаний.

Вопрос: "${question}"
${context ? `Контекст: ${context}` : ''}

Требования:
1. Сохрани основную суть вопроса
2. Добавь синонимы и связанные термины
3. Сделай запрос более конкретным для поиска
4. Укажи намерение пользователя

Ответ в формате JSON:
{
  "content": "переформулированный вопрос",
  "intent": "намерение пользователя",
  "confidence": 0.9
}`;
  }

  /**
   * Построение промпта для генерации черновика
   */
  private buildDraftPrompt(question: string, sources: any[], context?: string): string {
    const sourcesText = sources.map((s, i) => 
      `${i + 1}. ${s.title}\n${s.content}\n`
    ).join('\n');

    return `Сгенерируй черновик ответа на основе найденных источников.

Вопрос: "${question}"
${context ? `Контекст: ${context}` : ''}

Источники:
${sourcesText}

Требования:
1. Ответь на вопрос пользователя
2. Используй информацию из источников
3. Будь кратким и понятным
4. Если информации недостаточно, укажи это
5. Не добавляй информацию, которой нет в источниках

Ответ:`;
  }

  /**
   * Построение промпта для улучшения ответа
   */
  private buildRefinePrompt(question: string, draft: string, sources: any[], context?: string): string {
    const sourcesText = sources.map((s, i) => 
      `${i + 1}. ${s.title}\n${s.content}\n`
    ).join('\n');

    return `Улучши черновик ответа, используя RAG подход.

Вопрос: "${question}"
${context ? `Контекст: ${context}` : ''}

Черновик: "${draft}"

Источники:
${sourcesText}

Требования:
1. Улучши качество и точность ответа
2. Добавь детали из источников
3. Сделай ответ более структурированным
4. Убедись, что все утверждения подкреплены источниками
5. Улучши читаемость и логику

Ответ в формате JSON:
{
  "content": "улучшенный ответ",
  "confidence": 0.9,
  "changes": ["список изменений"],
  "sourcesUsed": ["список использованных источников"]
}`;
  }

  /**
   * Получение системного промпта для конкретной задачи
   */
  private getSystemPrompt(task: string): string {
    const prompts = {
      rephrase: 'Ты эксперт по переформулировке вопросов для улучшения поиска. Отвечай только в JSON формате.',
      draft: 'Ты эксперт по созданию ответов на основе источников. Будь точным и используй только предоставленную информацию.',
      refine: 'Ты эксперт по улучшению ответов через RAG. Анализируй источники и улучшай качество ответов.',
    };

    return prompts[task as keyof typeof prompts] || prompts.draft;
  }

  /**
   * Проверка доступности API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.callOpenAI('Тест', 'draft');
      return true;
    } catch (error) {
      logError('Ошибка подключения к OpenAI API', { error });
      return false;
    }
  }
}
