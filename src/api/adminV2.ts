import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';
import { logger, withRequest } from '../utils/logger';
import { handleError, asyncHandler } from '../utils/errorHandler';
import conversationsRouter from './routes/conversations';
import recommendationsRouter from './routes/recommendations';
import { authMiddleware, ipAllowlistMiddleware } from '../utils/security';

const app = express();

// Security middleware
app.use(helmet());
app.set('trust proxy', 1);

// CORS configuration
const adminOrigins = env.ADMIN_ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
const adminCors = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (adminOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 204,
});

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: parseInt(env.ADMIN_RATE_WINDOW_MS || '60000', 10),
  max: parseInt(env.ADMIN_RATE_MAX || '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.log?.warn('Rate limit exceeded');
    res.status(429).json({ error: 'Too Many Requests' });
  },
});

// Request logging middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.start = Date.now();
  req.log = withRequest(req);
  next();
});

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ 
    ok: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Admin routes with security
app.use('/admin', adminCors, ipAllowlistMiddleware(), rateLimiter, authMiddleware(['admin', 'editor']));
app.use('/admin/conversations', conversationsRouter);
app.use('/admin/recommendations', recommendationsRouter);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { statusCode, message } = handleError(err, req);
  res.status(statusCode).json({ error: message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;