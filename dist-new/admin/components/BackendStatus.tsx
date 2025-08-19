'use client';

import { useState, useEffect } from 'react';
import { apiClient, type HealthCheckResponse } from '../lib/api-client';

interface BackendStatusProps {
  className?: string;
}

export default function BackendStatus({ className = '' }: BackendStatusProps) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkBackendHealth = async () => {
    try {
      setStatus('loading');
      const response = await apiClient.healthCheck();
      
      if (response.success && response.data) {
        setHealthData(response.data);
        setStatus('connected');
        setLastCheck(new Date());
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to check backend health:', error);
      setStatus('error');
    }
  };

  useEffect(() => {
    checkBackendHealth();
    
    // Проверяем каждые 30 секунд
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-300';
      default:
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'error':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Подключен';
      case 'error':
        return 'Ошибка подключения';
      default:
        return 'Проверка...';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <h3 className="font-medium">Статус Backend API</h3>
            <p className="text-sm opacity-80">{getStatusText()}</p>
          </div>
        </div>
        
        <button
          onClick={checkBackendHealth}
          disabled={status === 'loading'}
          className="px-3 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-75 disabled:opacity-50"
        >
          Обновить
        </button>
      </div>

      {healthData && status === 'connected' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="opacity-70">Сервис:</span>
              <span className="ml-1 font-medium">{healthData.service}</span>
            </div>
            <div>
              <span className="opacity-70">Время:</span>
              <span className="ml-1 font-medium">
                {new Date(healthData.time).toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          {lastCheck && (
            <div className="mt-2 text-xs opacity-70">
              Последняя проверка: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <p className="text-xs opacity-80">
            Не удается подключиться к backend API. 
            Проверьте настройки и попробуйте снова.
          </p>
        </div>
      )}
    </div>
  );
}
