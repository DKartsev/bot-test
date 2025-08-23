import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logError, logWarning } from '../utils/logger';

// Расширяем интерфейс Request для добавления пользователя
// Типы для расширения Express Request
interface AuthUser {
  id: number;
  email: string;
  role: string;
  operatorId?: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Проверяем наличие обязательных переменных окружения
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET; // Не используется

// Предупреждение для разработки
if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET не установлен, используется значение по умолчанию для разработки');
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Токен аутентификации не предоставлен',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7); // Убираем 'Bearer '

    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as Record<string, unknown>;

      // Проверяем структуру токена
      if (!decoded['id'] || !decoded['email'] || !decoded['role']) {
        logWarning('Недействительная структура JWT токена', {
          decoded,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(401).json({
          error: 'Недействительная структура токена',
          code: 'INVALID_TOKEN_STRUCTURE',
        });
        return;
      }

      req.user = {
        id: Number(decoded['id']),
        email: String(decoded['email']),
        role: String(decoded['role']),
        operatorId: decoded['operatorId'] ? Number(decoded['operatorId']) : undefined,
      };

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        logWarning('JWT токен истек', {
          token: `${token.substring(0, 20)}...`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(401).json({
          error: 'Токен аутентификации истек',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        logWarning('Недействительный JWT токен', {
          token: `${token.substring(0, 20)}...`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(401).json({
          error: 'Недействительный токен аутентификации',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      logError('Ошибка верификации JWT токена', {
        error: jwtError,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(401).json({
        error: 'Ошибка верификации токена',
        code: 'TOKEN_VERIFICATION_ERROR',
      });
      return;
    }
  } catch (error) {
    logError('Ошибка аутентификации', {
      error,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error: 'Ошибка аутентификации',
      code: 'AUTH_ERROR',
    });
    return;
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Требуется аутентификация',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logWarning('Попытка доступа к защищенному ресурсу', {
        user: req.user,
        requiredRoles: allowedRoles,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
      });

      res.status(403).json({
        error: 'Недостаточно прав для выполнения операции',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
};

export const requireOperator = requireRole(['operator', 'senior_operator', 'admin']);
export const requireSeniorOperator = requireRole(['senior_operator', 'admin']);
export const requireAdmin = requireRole(['admin']);

// Middleware для проверки активности оператора
export const requireActiveOperator = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Требуется аутентификация',
      code: 'AUTHENTICATION_REQUIRED',
    });
    return;
  }

  // Проверяем, что пользователь является оператором
  if (!['operator', 'senior_operator', 'admin'].includes(req.user.role)) {
    res.status(403).json({
      error: 'Доступ только для операторов',
      code: 'OPERATOR_ACCESS_REQUIRED',
    });
    return;
  }

  // Здесь можно добавить проверку активности оператора в БД
  // Пока что просто пропускаем
  next();
};

// Middleware для проверки владения ресурсом
export const requireResourceOwnership = (resourceType: 'chat' | 'message' | 'note' | 'case') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Требуется аутентификация',
        code: 'AUTHENTICATION_REQUIRED',
      });
      return;
    }

    // Администраторы и старшие операторы имеют доступ ко всем ресурсам
    if (['admin', 'senior_operator'].includes(req.user.role)) {
      next();
      return;
    }

    // Для обычных операторов проверяем владение ресурсом
    try {
      const resourceId = parseInt(req.params['id'] || '0');
      if (isNaN(resourceId) || resourceId <= 0) {
        res.status(400).json({
          error: 'Недействительный ID ресурса',
          code: 'INVALID_RESOURCE_ID',
        });
        return;
      }

      // Здесь должна быть логика проверки владения ресурсом
      // Пока что просто пропускаем
      next();
    } catch (error) {
      logError('Ошибка проверки владения ресурсом', {
        error,
        resourceType,
        resourceId: req.params['id'],
        user: req.user,
      });

      res.status(500).json({
        error: 'Ошибка проверки доступа к ресурсу',
        code: 'RESOURCE_ACCESS_CHECK_ERROR',
      });
      return;
    }
  };
};

// Middleware для rate limiting (базовая реализация)
export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  const { windowMs, maxRequests, message = 'Слишком много запросов' } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!requests.has(key) || now > requests.get(key)!.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      const current = requests.get(key)!;
      current.count++;

      if (current.count > maxRequests) {
        logWarning('Превышен лимит запросов', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          count: current.count,
          limit: maxRequests,
        });

        res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }
    }

    next();
  };
};
