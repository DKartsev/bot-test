'use client';

import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { ChatFilters } from '../types/chat';
import { X, Check } from 'lucide-react';

interface FiltersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FiltersOverlay({ isOpen, onClose }: FiltersOverlayProps) {
  const { state, dispatch } = useChat();
  const overlayRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    { value: 'new', label: 'Новые' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'closed', label: 'Закрытые' },
  ];

  const sourceOptions = [
    { value: 'telegram', label: 'Telegram' },
    { value: 'website', label: 'Сайт' },
    { value: 'p2p', label: 'P2P' },
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Срочно' },
    { value: 'high', label: 'Высокий' },
    { value: 'medium', label: 'Средний' },
    { value: 'low', label: 'Низкий' },
  ];

  const categoryOptions = [
    { value: 'payment', label: 'Платежи' },
    { value: 'verification', label: 'Верификация' },
    { value: 'dispute', label: 'Споры' },
    { value: 'technical', label: 'Техподдержка' },
    { value: 'general', label: 'Общие вопросы' },
  ];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const updateFilter = (key: keyof ChatFilters, value: any) => {
    const currentFilters = { ...state.filters };
    
    if (Array.isArray(currentFilters[key])) {
      const currentArray = currentFilters[key] as any[];
      if (currentArray.includes(value)) {
        currentFilters[key] = currentArray.filter(item => item !== value);
      } else {
        currentFilters[key] = [...currentArray, value];
      }
    } else {
      currentFilters[key] = value;
    }

    dispatch({ type: 'SET_FILTERS', payload: currentFilters });
  };

  const clearAllFilters = () => {
    dispatch({ type: 'SET_FILTERS', payload: {} });
  };

  const applyFilters = () => {
    onClose();
  };

  const getActiveFiltersCount = () => {
    return Object.values(state.filters).filter(value => 
      value !== undefined && 
      (Array.isArray(value) ? value.length > 0 : value !== false)
    ).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div
        ref={overlayRef}
        className="bg-white rounded-card shadow-card-hover w-96 max-h-[80vh] overflow-y-auto"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h3 className="text-lg font-semibold text-text-primary">Фильтры</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-button transition-colors"
            aria-label="Закрыть фильтры"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Содержимое фильтров */}
        <div className="p-4 space-y-6">
          {/* Статус */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Статус</h4>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.filters.status?.includes(option.value as any) || false}
                    onChange={() => updateFilter('status', option.value)}
                    className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                  />
                  <span className="text-sm text-text-secondary">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Источник */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Источник</h4>
            <div className="space-y-2">
              {sourceOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.filters.source?.includes(option.value as any) || false}
                    onChange={() => updateFilter('source', option.value)}
                    className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                  />
                  <span className="text-sm text-text-secondary">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Приоритет */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Приоритет</h4>
            <div className="space-y-2">
              {priorityOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.filters.priority?.includes(option.value as any) || false}
                    onChange={() => updateFilter('priority', option.value)}
                    className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                  />
                  <span className="text-sm text-text-secondary">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Категория */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Категория</h4>
            <div className="space-y-2">
              {categoryOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.filters.category?.includes(option.value as any) || false}
                    onChange={() => updateFilter('category', option.value)}
                    className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                  />
                  <span className="text-sm text-text-secondary">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Дополнительные фильтры */}
          <div>
            <h4 className="font-medium text-text-primary mb-3">Дополнительно</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.filters.has_attachments || false}
                  onChange={() => updateFilter('has_attachments', !state.filters.has_attachments)}
                  className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                />
                <span className="text-sm text-text-secondary">Только с вложениями</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.filters.assigned_to_me || false}
                  onChange={() => updateFilter('assigned_to_me', !state.filters.assigned_to_me)}
                  className="w-4 h-4 text-accent-blue border-border-medium rounded focus:ring-accent-blue"
                />
                <span className="text-sm text-text-secondary">Назначенные мне</span>
              </label>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-between p-4 border-t border-border-light bg-gray-50">
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Сбросить
          </button>
          
          <div className="flex items-center space-x-3">
            {getActiveFiltersCount() > 0 && (
              <span className="px-2 py-1 bg-accent-blue text-white text-xs rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
            
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-accent-blue text-white text-sm rounded-button hover:bg-accent-blue-dark transition-colors flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Применить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
