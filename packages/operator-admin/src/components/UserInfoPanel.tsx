'use client';

import React, { useState } from 'react';
import { User } from '../types/chat';
import { 
  User as UserIcon, 
  Shield, 
  ShieldOff, 
  RotateCcw, 
  History,
  Eye,
  X,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface UserInfoPanelProps {
  user: User | null;
}

export function UserInfoPanel({ user }: UserInfoPanelProps) {
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  if (!user) {
    return (
      <div className="w-80 bg-white border-l border-border-light p-6">
        <div className="text-center text-text-secondary">
          <UserIcon className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <h3 className="text-lg font-medium mb-2">Информация о пользователе</h3>
          <p className="text-sm">Выберите чат для просмотра информации</p>
        </div>
      </div>
    );
  }

  const handleBlockUser = () => {
    if (blockReason.trim()) {
      console.log('Blocking user:', { userId: user.id, reason: blockReason });
      setBlockReason('');
      setShowBlockModal(false);
    }
  };

  const handleUnblockUser = () => {
    console.log('Unblocking user:', user.id);
  };

  const handleCreateRefund = () => {
    if (refundAmount && refundReason.trim()) {
      console.log('Creating refund:', { 
        userId: user.id, 
        amount: refundAmount, 
        reason: refundReason 
      });
      setRefundAmount('');
      setRefundReason('');
      setShowRefundModal(false);
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(balance);
  };

  return (
    <div className="w-80 bg-white border-l border-border-light overflow-y-auto">
      {/* Заголовок */}
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Информация о пользователе</h3>
        </div>
        
        {/* Аватар и основная информация */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-accent-blue rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          
          <h4 className="text-xl font-semibold text-text-primary mb-1">{user.name}</h4>
          <p className="text-sm text-text-secondary">ID: {user.id}</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-button">
            <div className="text-lg font-semibold text-text-primary">{user.deals_count}</div>
            <div className="text-xs text-text-secondary">Сделок</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-button">
            <div className="text-lg font-semibold text-text-primary">
              {formatBalance(user.balance)}
            </div>
            <div className="text-xs text-text-secondary">Баланс</div>
          </div>
        </div>

        {/* Метки */}
        <div className="space-y-2">
          {user.is_vip && (
            <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-button">
              <CheckCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">VIP пользователь</span>
            </div>
          )}
          
          {user.is_blocked && (
            <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-button">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800 font-medium">Заблокирован</span>
            </div>
          )}
        </div>
      </div>

      {/* Блокировки и удержания */}
      {user.holds.length > 0 && (
        <div className="p-6 border-b border-border-light">
          <h4 className="font-medium text-text-primary mb-3">Активные удержания</h4>
          <div className="space-y-2">
            {user.holds.map((hold, index) => (
              <div key={index} className="p-2 bg-orange-50 rounded-button text-sm text-orange-800">
                {hold}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Флаги */}
      {user.flags.length > 0 && (
        <div className="p-6 border-b border-border-light">
          <h4 className="font-medium text-text-primary mb-3">Метки</h4>
          <div className="flex flex-wrap gap-2">
            {user.flags.map((flag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="p-6 space-y-3">
        <button
          onClick={() => window.open(`/user/${user.id}`, '_blank')}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors text-text-primary"
        >
          <Eye className="w-4 h-4" />
          <span>Открыть профиль</span>
        </button>

        {user.is_blocked ? (
          <button
            onClick={handleUnblockUser}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-green-50 hover:bg-green-100 rounded-button transition-colors text-green-800"
          >
            <ShieldOff className="w-4 h-4" />
            <span>Разблокировать</span>
          </button>
        ) : (
          <button
            onClick={() => setShowBlockModal(true)}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 rounded-button transition-colors text-red-800"
          >
            <Shield className="w-4 h-4" />
            <span>Заблокировать</span>
          </button>
        )}

        <button
          onClick={() => setShowRefundModal(true)}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-orange-50 hover:bg-orange-100 rounded-button transition-colors text-orange-800"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Создать возврат</span>
        </button>

        <button
          onClick={() => window.open(`/user/${user.id}/history`, '_blank')}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors text-text-primary"
        >
          <History className="w-4 h-4" />
          <span>История операций</span>
        </button>
      </div>

      {/* Модальное окно блокировки */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Заблокировать пользователя</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-1 hover:bg-gray-100 rounded-button transition-colors"
                title="Закрыть"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Причина блокировки
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Укажите причину блокировки..."
                className="w-full p-3 border border-border-light rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Отмена
              </button>
              
              <button
                onClick={handleBlockUser}
                disabled={!blockReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-button hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно возврата */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Создать возврат</h3>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-1 hover:bg-gray-100 rounded-button transition-colors"
                title="Закрыть"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Сумма возврата
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full p-3 border border-border-light rounded-button focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Причина возврата
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-3 border border-border-light rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                  rows={3}
                  placeholder="Укажите причину возврата..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Отмена
              </button>
              
              <button
                onClick={handleCreateRefund}
                disabled={!refundAmount || !refundReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-button hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                Создать возврат
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
