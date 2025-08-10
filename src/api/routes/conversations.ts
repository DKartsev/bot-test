import express from 'express';
import { conversationService } from '../../services/conversationService';
import { messageService } from '../../services/messageService';
import { validateParams, validateBody, validateQuery, idParamSchema, paginationQuerySchema } from '../middleware/validation';
import { asyncHandler } from '../../utils/errorHandler';
import { z } from 'zod';

const router = express.Router();

const conversationFiltersSchema = z.object({
  status: z.enum(['open', 'closed', 'escalated']).optional(),
  handoff: z.enum(['bot', 'human']).optional(),
  category_id: z.string().optional(),
  assignee_name: z.string().optional(),
  search: z.string().optional(),
}).merge(paginationQuerySchema);

const updateConversationSchema = z.object({
  status: z.enum(['open', 'closed', 'escalated']).optional(),
  handoff: z.enum(['bot', 'human']).optional(),
  assignee_name: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

const claimConversationSchema = z.object({
  assignee_name: z.string().min(1),
});

const replySchema = z.object({
  text: z.string().min(1),
  author_name: z.string().min(1),
});

// GET /conversations
router.get('/', 
  validateQuery(conversationFiltersSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const conversations = await conversationService.getConversations(req.query as any);
    
    // Add last message preview
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await messageService.getMessages(conv.id, { limit: 1 });
        return {
          ...conv,
          last_message_preview: messages[0]?.content || null,
        };
      })
    );

    res.json({ conversations: conversationsWithPreview });
  })
);

// GET /conversations/:id
router.get('/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const conversation = await conversationService.getConversation(req.params.id);
    res.json(conversation);
  })
);

// PATCH /conversations/:id
router.patch('/:id',
  validateParams(idParamSchema),
  validateBody(updateConversationSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const conversation = await conversationService.updateConversation(req.params.id, req.body);
    res.json(conversation);
  })
);

// POST /conversations/:id/claim
router.post('/:id/claim',
  validateParams(idParamSchema),
  validateBody(claimConversationSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const conversation = await conversationService.claimConversation(req.params.id, req.body.assignee_name);
    res.json(conversation);
  })
);

// POST /conversations/:id/takeover
router.post('/:id/takeover',
  validateParams(idParamSchema),
  validateBody(claimConversationSchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const conversation = await conversationService.takeoverConversation(req.params.id, req.body.assignee_name);
    res.json(conversation);
  })
);

// GET /conversations/:id/messages
router.get('/:id/messages',
  validateParams(idParamSchema),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const messages = await messageService.getMessages(req.params.id, req.query as any);
    res.json({ messages });
  })
);

// POST /conversations/:id/reply
router.post('/:id/reply',
  validateParams(idParamSchema),
  validateBody(replySchema),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const message = await messageService.createMessage({
      conversation_id: req.params.id,
      sender: 'operator',
      content: req.body.text,
    });
    res.json(message);
  })
);

export default router;