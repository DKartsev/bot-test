import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { OperatorService } from '../services/operator';
import { rateLimitMiddleware } from '../services/rateLimiter';

const router = express.Router();
const operatorService = new OperatorService();

// Схемы валидации
const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов')
});

const registerSchema = z.object({
  first_name: z.string().min(2, 'Имя должно быть не менее 2 символов'),
  last_name: z.string().min(2, 'Фамилия должна быть не менее 2 символов'),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  role: z.enum(['operator', 'admin', 'supervisor']).default('operator')
});

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<any>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

// Генерация JWT токенов
const generateTokens = (operator: any) => {
  const accessToken = jwt.sign(
    { 
      id: operator.id, 
      email: operator.email, 
      role: operator.role,
      type: 'operator'
    },
    process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required',
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { 
      id: operator.id, 
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Логин оператора
router.post('/login', rateLimitMiddleware.auth(), asyncHandler(async (req, res) => {
  try {
    // Валидация входных данных
    const validatedData = loginSchema.parse(req.body);
    
    // Поиск оператора по email
    const operator = await operatorService.getOperatorByEmail(validatedData.email);
    if (!operator) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(validatedData.password, operator.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }

    // Проверка активности оператора
    if (!operator.is_active) {
      return res.status(403).json({ 
        success: false, 
        error: 'Аккаунт заблокирован' 
      });
    }

    // Генерация токенов
    const { accessToken, refreshToken } = generateTokens(operator);

    // Обновление последнего входа
    await operatorService.updateLastLogin(operator.id);

    res.json({
      success: true,
      data: {
        operator: {
          id: operator.id,
          name: `${operator.first_name} ${operator.last_name}`,
          email: operator.email,
          role: operator.role,
          is_active: operator.is_active
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      message: 'Успешный вход в систему'
    });

      } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ошибка валидации данных',
          details: error.issues 
        });
      }

      console.error('Ошибка входа:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
      });
    }
}));

// Регистрация нового оператора (только для разработки)
router.post('/register', rateLimitMiddleware.auth(), asyncHandler(async (req, res) => {
  try {
    // В продакшене регистрация запрещена
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        error: 'Регистрация запрещена в продакшене' 
      });
    }

    // Валидация входных данных
    const validatedData = registerSchema.parse(req.body);
    
    // Проверка существования оператора
    const existingOperator = await operatorService.getOperatorByEmail(validatedData.email);
    if (existingOperator) {
      return res.status(409).json({ 
        success: false, 
        error: 'Оператор с таким email уже существует' 
      });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Создание оператора
    const newOperator = await operatorService.createOperator({
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      email: validatedData.email,
      password_hash: passwordHash,
      role: validatedData.role,
      is_active: true,
      max_chats: 10
    });

    // Генерация токенов
    const { accessToken, refreshToken } = generateTokens(newOperator);

    res.status(201).json({
      success: true,
      data: {
        operator: {
          id: newOperator.id,
          name: `${newOperator.first_name} ${newOperator.last_name}`,
          email: newOperator.email,
          role: newOperator.role,
          is_active: newOperator.is_active
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      message: 'Оператор успешно зарегистрирован'
    });

      } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ошибка валидации данных',
          details: error.issues 
        });
      }

      console.error('Ошибка регистрации:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
      });
    }
}));

// Обновление токена
router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh токен обязателен' 
      });
    }

    // Верификация refresh токена
    const decoded = jwt.verify(
      refresh_token, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required'
    ) as any;

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный тип токена' 
      });
    }

    // Получение оператора
    const operator = await operatorService.getOperatorById(decoded.id);
    if (!operator || !operator.is_active) {
      return res.status(401).json({ 
        success: false, 
        error: 'Оператор не найден или заблокирован' 
      });
    }

    // Генерация новых токенов
    const { accessToken, refreshToken } = generateTokens(operator);

    res.json({
      success: true,
      data: {
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      },
      message: 'Токены обновлены'
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Недействительный refresh токен' 
      });
    }

    console.error('Ошибка обновления токена:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
}));

// Выход из системы
router.post('/logout', asyncHandler(async (req, res) => {
  try {
    // В реальном приложении здесь можно добавить токен в blacklist
    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });
  } catch (error) {
    console.error('Ошибка выхода:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
}));

// Получение профиля текущего оператора
router.get('/profile', asyncHandler(async (req, res) => {
  try {
    // Получаем оператора из middleware аутентификации
    const operatorId = (req as any).user?.id;
    if (!operatorId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Не авторизован' 
      });
    }

    const operator = await operatorService.getOperatorById(operatorId);
    if (!operator) {
      return res.status(404).json({ 
        success: false, 
        error: 'Оператор не найден' 
      });
    }

    res.json({
      success: true,
      data: {
        operator: {
          id: operator.id,
          name: `${operator.first_name} ${operator.last_name}`,
          email: operator.email,
          role: operator.role,
          is_active: operator.is_active,
          max_chats: operator.max_chats,
          created_at: operator.created_at,
          last_login: operator.last_login
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
}));

// Тестовый endpoint для создания оператора (только для разработки)
router.post('/create-test-operator', asyncHandler(async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        error: 'Создание тестовых операторов запрещено в продакшене' 
      });
    }

    // Создаем тестового оператора
    const passwordHash = await bcrypt.hash('test123', 12);
    const testOperator = await operatorService.createOperator({
      first_name: 'Test',
      last_name: 'Operator',
      email: 'test@operator.com',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
      max_chats: 10
    });

    // Генерируем токены
    const { accessToken, refreshToken } = generateTokens(testOperator);

    res.json({
      success: true,
      data: {
        operator: {
          id: testOperator.id,
          name: `${testOperator.first_name} ${testOperator.last_name}`,
          email: testOperator.email,
          role: testOperator.role
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken
        },
        credentials: {
          email: 'test@operator.com',
          password: 'test123'
        }
      },
      message: 'Тестовый оператор создан успешно'
    });

  } catch (error) {
    console.error('Ошибка создания тестового оператора:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось создать тестового оператора' 
    });
  }
}));

export default router;
