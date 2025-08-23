import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperClipIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CannedResponse } from '../types';

interface ToolsPanelProps {
  onSendMessage: (text: string, attachments?: File[]) => void;
  onCreateNote: (content: string, isInternal: boolean) => void;
  onImproveResponse: (text: string, isOperator: boolean) => void;
  currentMessageText: string;
  onMessageTextChange: (text: string) => void;
}

export function ToolsPanel({
  onSendMessage,
  onCreateNote,
  onImproveResponse,
  currentMessageText,
  onMessageTextChange
}: ToolsPanelProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [isImproving, setIsImproving] = useState(false);
  const [improvedText, setImprovedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Загружаем готовые ответы при инициализации
  useEffect(() => {
    loadCannedResponses();
  }, []);

  const loadCannedResponses = async () => {
    setLoadingResponses(true);
    try {
      const response = await fetch('http://localhost:3000/api/canned-responses', {
        headers: {
          'Authorization': `Bearer ${(globalThis as any).localStorage?.getItem('auth_token') || 'test-token-1'}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const responses = await response.json();
        setCannedResponses(responses as any);
      } else {
        // Fallback к базовым шаблонам
        setCannedResponses([
          {
            id: 1,
            title: 'Приветствие',
            content: 'Здравствуйте! Чем могу помочь?',
            category: 'Общие',
            tags: ['приветствие', 'начало'],
            shortcut: '1'
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки готовых ответов:', error);
      // Fallback к базовым шаблонам
      setCannedResponses([
        {
          id: 1,
          title: 'Приветствие',
          content: 'Здравствуйте! Чем могу помочь?',
          category: 'Общие',
          tags: ['приветствие', 'начало'],
          shortcut: '1'
        }
      ]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const instructions = [
    {
      title: 'Обработка жалоб',
      content: '1. Выслушайте пользователя полностью\n2. Извинитесь за неудобства\n3. Предложите решение\n4. Зафиксируйте в системе'
    },
    {
      title: 'Работа с VIP клиентами',
      content: 'VIP клиенты получают приоритетное обслуживание. Всегда отвечайте в течение 5 минут.'
    },
    {
      title: 'Эскалация проблем',
      content: 'Если проблема не решается более 10 минут, передайте старшему оператору или создайте кейс.'
    }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((e.target as any).files || []);
    if (files.length > 0) {
      // В реальном приложении здесь будет загрузка файлов
      onSendMessage(currentMessageText, files);
    }
  };

  const handleCreateNote = () => {
    if (noteContent.trim()) {
      onCreateNote(noteContent, isInternalNote);
      setNoteContent('');
      setShowNoteModal(false);
    }
  };

  const handleTemplateSelect = (template: CannedResponse) => {
    onMessageTextChange(template.content);
    setShowTemplatesModal(false);
  };

  const handleImproveResponse = async (isOperator: boolean) => {
    if (!currentMessageText.trim()) return;
    
    setIsImproving(true);
    try {
      // Имитация AI улучшения
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let improved = currentMessageText;
      if (isOperator) {
        improved = `[ОПЕРАТОР] ${currentMessageText}\n\nДополнительная информация и контекст для пользователя.`;
      } else {
        improved = `Улучшенная версия: ${currentMessageText}\n\nБолее вежливо и информативно.`;
      }
      
      setImprovedText(improved);
      onMessageTextChange(improved);
    } catch (error) {
      console.error('Ошибка улучшения ответа:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentMessageText.trim()) {
        onSendMessage(currentMessageText);
      }
    }
  };

  return (
    <>
      {/* Панель инструментов */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Прикрепить файл"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowNoteModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Заметка (внутренняя)"
          >
            <DocumentTextIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Сохранённые ответы"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowInstructionsModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Инструкции"
          >
            <BookOpenIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleImproveResponse(false)}
            disabled={!currentMessageText.trim() || isImproving}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Улучшить ответ (AI)"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleImproveResponse(true)}
            disabled={!currentMessageText.trim() || isImproving}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Улучшить ответ (Оператор)"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Поле ввода */}
        <div className="flex space-x-2">
          <textarea
            value={currentMessageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={() => onSendMessage(currentMessageText)}
            disabled={!currentMessageText.trim()}
            className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Отправить
          </button>
        </div>

        {/* Скрытый input для файлов */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          aria-label="Выбор файлов для прикрепления"
        />
      </div>

      {/* Модальное окно заметки */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Создать заметку</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Закрыть модальное окно заметки"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Внутренняя заметка (не видна пользователю)</span>
              </label>
            </div>
            
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Введите текст заметки..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!noteContent.trim()}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно шаблонов */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Шаблоны ответов</h3>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Закрыть модальное окно шаблонов"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {cannedResponses.map((template) => (
                <div
                  key={template.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{template.title}</h4>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {template.shortcut}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{template.category}</span>
                    <div className="flex space-x-1">
                      {template.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно инструкций */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Инструкции</h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Закрыть модальное окно инструкций"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {instructions.map((instruction, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{instruction.title}</h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                    {instruction.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
