import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

interface BackendStats {
  total_chats: number;
  waiting_chats: number;
  active_operators: number;
  avg_response_time: number;
}

export function useBackendConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Проверяем соединение
      const health = await apiClient.healthCheck();
      setIsConnected(true);
      
      // Получаем статистику
      try {
        const backendStats = await apiClient.getStats();
        setStats(backendStats);
      } catch (statsError) {
        console.warn('Не удалось получить статистику:', statsError);
      }
      
      setLastCheck(new Date());
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматическая проверка каждые 30 секунд
  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Ручная проверка соединения
  const retryConnection = () => {
    checkConnection();
  };

  return {
    isConnected,
    isLoading,
    error,
    stats,
    lastCheck,
    retryConnection,
    checkConnection
  };
}
