'use client';

import React, { useState } from 'react';
import { 
  StickyNote, 
  MessageSquare, 
  BookOpen, 
  Paperclip, 
  Sparkles,
  X,
  Plus,
  Search
} from 'lucide-react';

interface ToolsPanelProps {
  onNoteAdd: (note: string) => void;
  onTemplateSelect: (template: string) => void;
  onInstructionSelect: (instruction: string) => void;
  onFileAttach: (file: File) => void;
  onImproveResponse: (isOperator: boolean) => void;
}

export function ToolsPanel({
  onNoteAdd,
  onTemplateSelect,
  onInstructionSelect,
  onFileAttach,
  onImproveResponse
}: ToolsPanelProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Заглушки для данных
  const templates = [
    { id: '1', title: 'Приветствие', content: 'Здравствуйте! Чем могу помочь?' },
    { id: '2', title: 'Уточнение', content: 'Можете уточнить детали?' },
    { id: '3', title: 'Решение', content: 'Проблема решена. Есть ли еще вопросы?' },
    { id: '4', title: 'Ожидание', content: 'Обрабатываю ваш запрос, подождите немного.' },
    { id: '5', title: 'Благодарность', content: 'Спасибо за обращение!' },
  ];

  const instructions = [
    { id: '1', title: 'Обработка платежей', content: 'Проверить статус в системе, сверить данные...' },
    { id: '2', title: 'Верификация', content: 'Запросить документы, проверить соответствие...' },
    { id: '3', title: 'Споры', content: 'Собрать информацию, связаться с участниками...' },
    { id: '4', title: 'Техподдержка', content: 'Проверить логи, воспроизвести проблему...' },
  ];

  const handleNoteSubmit = () => {
    if (noteText.trim()) {
      onNoteAdd(noteText);
      setNoteText('');
      setShowNoteModal(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileAttach(file);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInstructions = instructions.filter(instruction =>
    instruction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    instruction.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border-t border-border-light p-4">
      <div className="flex items-center justify-between space-x-2">
        {/* Заметка */}
        <button
          onClick={() => setShowNoteModal(true)}
          className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group"
          title="Добавить заметку"
        >
          <StickyNote className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Заметка</span>
        </button>

        {/* Шаблоны */}
        <button
          onClick={() => setShowTemplatesModal(true)}
          className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group"
          title="Шаблоны ответов"
        >
          <MessageSquare className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Шаблоны</span>
        </button>

        {/* Инструкции */}
        <button
          onClick={() => setShowInstructionsModal(true)}
          className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group"
          title="Инструкции"
        >
          <BookOpen className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Инструкции</span>
        </button>

        {/* Прикрепление файла */}
        <label className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group cursor-pointer">
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Paperclip className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Файл</span>
        </label>

        {/* Улучшить ответ */}
        <button
          onClick={() => onImproveResponse(false)}
          className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group"
          title="Улучшить ответ с помощью AI"
        >
          <Sparkles className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Улучшить</span>
        </button>

        {/* Улучшить ответ (О) */}
        <button
          onClick={() => onImproveResponse(true)}
          className="flex-1 flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-button transition-colors group"
          title="Улучшить ответ (операторский)"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-text-secondary group-hover:text-accent-blue mb-1" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-blue text-white text-xs rounded-full flex items-center justify-center font-bold">
              О
            </span>
          </div>
          <span className="text-xs text-text-secondary group-hover:text-accent-blue">Улучшить (О)</span>
        </button>
      </div>

      {/* Модальное окно заметки */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Добавить заметку</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 hover:bg-gray-100 rounded-button transition-colors"
                title="Закрыть"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Введите заметку..."
              className="w-full p-3 border border-border-light rounded-button resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              rows={4}
            />
            
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Отмена
              </button>
              
              <button
                onClick={handleNoteSubmit}
                disabled={!noteText.trim()}
                className="px-4 py-2 bg-accent-blue text-white rounded-button hover:bg-accent-blue-dark disabled:opacity-50 transition-colors"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно шаблонов */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-2xl max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">Шаблоны ответов</h3>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-1 hover:bg-gray-100 rounded-button transition-colors"
                title="Закрыть"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Поиск по шаблонам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border-light rounded-button focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border border-border-light rounded-button hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      onTemplateSelect(template.content);
                      setShowTemplatesModal(false);
                    }}
                  >
                    <h4 className="font-medium text-text-primary mb-1">{template.title}</h4>
                    <p className="text-sm text-text-secondary">{template.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно инструкций */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-card-hover w-2xl max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">Инструкции</h3>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-button transition-colors"
                title="Закрыть"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Поиск по инструкциям..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border-light rounded-button focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredInstructions.map((instruction) => (
                  <div
                    key={instruction.id}
                    className="p-3 border border-border-light rounded-button hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      onInstructionSelect(instruction.content);
                      setShowInstructionsModal(false);
                    }}
                  >
                    <h4 className="font-medium text-text-primary mb-1">{instruction.title}</h4>
                    <p className="text-sm text-text-secondary">{instruction.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
