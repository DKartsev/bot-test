import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logError, logWarn } from '../utils/logger';

// Расширяем интерфейс Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        type: string;
      };
      operator?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

// Интерфейс для JWT payload
interface JWTPayload {
  id: number;
  email: string;
  role: string;
  type: string;
}

// Функция для извлечения токена из заголовка
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Поддерживаем разные форматы: "Bearer <token>" и просто "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

// Основной middleware аутентификации
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logWarn('Ошибка аутентификации', {
        error: { code: 'MISSING_TOKEN', message: 'Токен аутентификации не предоставлен' },
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(401).json({
        success: false,
        error: 'Токен аутентификации не предоставлен',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Верификация JWT токена
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Проверяем тип токена
      if (decoded.type !== 'operator') {
        logWarn('Ошибка аутентификации', {
          error: { code: 'INVALID_TOKEN_TYPE', message: 'Неверный тип токена' },
          ip: req.ip,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          tokenType: decoded.type
        });
        
        res.status(401).json({
          success: false,
          error: 'Неверный тип токена',
          code: 'INVALID_TOKEN_TYPE'
        });
        return;
      }

      // Добавляем информацию о пользователе в request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type
      };

      // Для совместимости добавляем также в operator
      req.operator = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      next();
      
    } catch (jwtError) {
      logWarn('Ошибка аутентификации', {
        error: { code: 'INVALID_TOKEN', message: 'Недействительный токен аутентификации' },
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        jwtError: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
      });
      
      res.status(401).json({
        success: false,
        error: 'Недействительный токен аутентификации',
        code: 'INVALID_TOKEN'
      });
    }
    
  } catch (error) {
    logError('Ошибка middleware аутентификации', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера аутентификации'
    });
  }
};

// Middleware для проверки роли оператора
export const requireOperator = (req: Request, res: Response, next: NextFunction): void => {
  authenticateToken(req, res, next);
};

// Middleware для проверки роли администратора
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'supervisor') {
      logWarn('Ошибка доступа', {
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Недостаточно прав для доступа' },
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userRole: req.user?.role,
        requiredRole: 'admin'
      });
      
      res.status(403).json({
        success: false,
        error: 'Недостаточно прав для доступа',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    
    next();
  });
};

// Middleware для проверки роли супервизора
export const requireSupervisor = (req: Request, res: Response, next: NextFunction): void => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    
    if (req.user?.role !== 'supervisor') {
      logWarn('Ошибка доступа', {
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Недостаточно прав для доступа' },
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userRole: req.user?.role,
        requiredRole: 'supervisor'
      });
      
      res.status(403).json({
        success: false,
        error: 'Недостаточно прав для доступа',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    
    next();
  });
};

// Middleware для проверки конкретной роли
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, (err) => {
      if (err) return next(err);
      
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        logWarn('Ошибка доступа', {
          error: { 
            code: 'INSUFFICIENT_PERMISSIONS', 
            message: 'Недостаточно прав для доступа' 
          },
          ip: req.ip,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          userRole: req.user?.role,
          requiredRoles: allowedRoles
        });
        
        res.status(403).json({
          success: false,
          error: 'Недостаточно прав для доступа',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }
      
      next();
    });
  };
};

// Middleware для проверки владения ресурсом (например, оператор может редактировать только свои чаты)
export const requireResourceOwnership = (resourceType: string, resourceIdExtractor: (req: Request) => number | null) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, (err) => {
      if (err) return next(err);
      
      // Админы и супервизоры имеют доступ ко всем ресурсам
      if (req.user?.role === 'admin' || req.user?.role === 'supervisor') {
        return next();
      }
      
      const resourceId = resourceIdExtractor(req);
      if (!resourceId) {
        res.status(400).json({
          success: false,
          error: 'Неверный ID ресурса'
        });
        return;
      }
      
      // Здесь можно добавить логику проверки владения ресурсом
      // Например, проверить, что чат принадлежит оператору
      // Пока что просто пропускаем для операторов
      next();
    });
  };
};

// Middleware для логирования аутентификации (для отладки)
export const logAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Auth Log: ${req.method} ${req.path} - User: ${req.user?.email || 'Unauthenticated'}`);
  }
  next();
};
