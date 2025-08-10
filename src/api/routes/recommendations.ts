import express from 'express';
import { z } from 'zod';
import { validateQuery, validateBody } from '../middleware/validation';
import { asyncHandler } from '../../utils/errorHandler';
import { getRecommendations, logInteraction } from '../../recommendations/engine';

const router = express.Router();

const recommendQuerySchema = z.object({
  user_id: z.string().uuid(),
  limit: z.coerce.number().min(1).max(20).default(5),
});

const logSchema = z.object({
  user_id: z.string().uuid(),
  question_id: z.string().uuid(),
  action: z.enum(['view', 'answer', 'feedback_like', 'feedback_dislike']),
});

router.get(
  '/',
  validateQuery(recommendQuerySchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { user_id, limit } = req.query as any;
    const questions = await getRecommendations(user_id, limit);
    res.json({ questions });
  })
);

router.post(
  '/log',
  validateBody(logSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    await logInteraction(req.body);
    res.json({ ok: true });
  })
);

export default router;
