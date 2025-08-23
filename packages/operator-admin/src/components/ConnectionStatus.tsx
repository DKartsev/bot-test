import React from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useBackendConnection } from '../hooks/useBackendConnection';

export function ConnectionStatus() {
  const { isConnected, isLoading, error, stats, lastCheck, retryConnection } = useBackendConnection();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Проверка соединения...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3 text-sm">
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Backend подключен</span>
        </div>
        
        {stats && (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Чатов: {stats.total_chats}</span>
            <span>Ожидают: {stats.waiting_chats}</span>
            <span>Операторов: {stats.active_operators}</span>
            <span>Время ответа: {Math.round(stats.avg_response_time)}с</span>
          </div>
        )}
        
        {lastCheck && (
          <span className="text-xs text-gray-400">
            Обновлено: {lastCheck.toLocaleTimeString('ru-RU')}
          </span>
        )}
        
        <button
          onClick={retryConnection}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить статус"
        >
          <ArrowPathIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-2 text-red-600">
        <XCircleIcon className="w-4 h-4" />
        <span>Backend недоступен</span>
      </div>
      
      {error && (
        <span className="text-xs text-red-500">
          {error}
        </span>
      )}
      
      <button
        onClick={retryConnection}
        className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
      >
        Повторить
      </button>
    </div>
  );
}
