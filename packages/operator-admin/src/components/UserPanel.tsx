import React from 'react';
import { User } from '../types';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface UserPanelProps {
  user: User | null;
  onOpenProfile: () => void;
  onBlockUser: () => void;
  onUnblockUser: () => void;
  onCreateRefund: () => void;
  onViewHistory: () => void;
}

export function UserPanel({
  user,
  onOpenProfile,
  onBlockUser,
  onUnblockUser,
  onCreateRefund,
  onViewHistory
}: UserPanelProps) {
  if (!user) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Выберите чат для просмотра информации о пользователе</p>
        </div>
      </div>
    );
  }

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(balance);
  };

  const getFlagIcon = (flag: string) => {
    switch (flag.toLowerCase()) {
      case 'vip': return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'blocked': return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      case 'verified': return <ShieldCheckIcon className="w-4 h-4 text-blue-600" />;
      default: return <DocumentTextIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Информация о пользователе</h3>
      </div>

      {/* Основная информация */}
      <div className="p-4 space-y-4">
        {/* Аватар и имя */}
        <div className="text-center">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.first_name}
              className="w-20 h-20 rounded-full mx-auto mb-3"
            />
          ) : (
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-medium text-2xl">
                {user.first_name.charAt(0)}
              </span>
            </div>
          )}
          <h4 className="font-semibold text-gray-900 text-lg">
            {user.first_name} {user.last_name}
          </h4>
          {user.username && (
            <p className="text-gray-500 text-sm">@{user.username}</p>
          )}
        </div>

        {/* Статус верификации */}
        <div className="flex items-center justify-center space-x-2">
          {user.is_verified ? (
            <span className="flex items-center space-x-1 text-green-600 text-sm">
              <CheckCircleIcon className="w-4 h-4" />
              <span>Верифицирован</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-gray-500 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Не верифицирован</span>
            </span>
          )}
        </div>

        {/* ID пользователя */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">ID пользователя:</span>
            <span className="font-mono text-sm text-gray-900">{user.id}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-600">Telegram ID:</span>
            <span className="font-mono text-sm text-gray-900">{user.telegram_id}</span>
          </div>
        </div>

        {/* Баланс */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Баланс</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatBalance(user.balance)}
          </div>
        </div>

        {/* Статистика сделок */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Статистика</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Сделок проведено:</span>
              <span className="font-medium text-gray-900">{user.deals_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Дата регистрации:</span>
              <span className="text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Последняя активность:</span>
              <span className="text-sm text-gray-900">
                {new Date(user.last_activity).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {/* Флаги и метки */}
        {user.flags.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="mb-2">
              <span className="font-medium text-gray-900 text-sm">Метки:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.flags.map((flag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs"
                >
                  {getFlagIcon(flag)}
                  <span>{flag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Статус блокировки */}
        {user.is_blocked && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2 text-red-800">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="font-medium">Пользователь заблокирован</span>
            </div>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={onOpenProfile}
          className="w-full px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Открыть профиль
        </button>
        
        {user.is_blocked ? (
          <button
            onClick={onUnblockUser}
            className="w-full px-4 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            Разблокировать
          </button>
        ) : (
          <button
            onClick={onBlockUser}
            className="w-full px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Заблокировать
          </button>
        )}
        
        <button
          onClick={onCreateRefund}
          className="w-full px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
        >
          Создать возврат
        </button>
        
        <button
          onClick={onViewHistory}
          className="w-full px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          История операций
        </button>
      </div>
    </div>
  );
}
