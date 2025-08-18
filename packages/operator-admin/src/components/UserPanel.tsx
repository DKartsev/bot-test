'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Tag, 
  MessageCircle,
  FileText,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';

interface UserPanelProps {
  selectedChatId?: string;
  userId?: string;
}

export default function UserPanel({ selectedChatId, userId }: UserPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes'>('info');
  const { userInfo, notes, history, loading, error, fetchUserInfo, fetchUserHistory, fetchConversationNotes } = useUsers();

  useEffect(() => {
    if (userId) {
      fetchUserInfo(userId);
      fetchUserHistory(userId);
    }
  }, [userId, fetchUserInfo, fetchUserHistory]);

  useEffect(() => {
    if (selectedChatId) {
      fetchConversationNotes(selectedChatId);
    }
  }, [selectedChatId, fetchConversationNotes]);

  const getStatusColor = (status: 'online' | 'offline' | 'away') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: 'online' | 'offline' | 'away') => {
    switch (status) {
      case 'online': return 'Онлайн';
      case 'away': return 'Отошел';
      case 'offline': return 'Оффлайн';
      default: return 'Неизвестно';
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'support': return <MessageCircle size={16} />;
      case 'order': return <FileText size={16} />;
      case 'complaint': return <AlertCircle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getHistoryStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'closed': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (!selectedChatId) {
    return (
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center"
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">Информация о пользователе</h3>
          <p className="text-sm">Выберите диалог, чтобы увидеть детали</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full"
    >
      {/* User Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl mx-auto">
              {(userInfo?.fullName || userInfo?.username || 'U').charAt(0)}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getStatusColor('online')} rounded-full border-4 border-white dark:border-gray-900`} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {userInfo?.fullName || userInfo?.username || 'Пользователь'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Онлайн • {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>
          
          {/* Tags */}
          {userInfo?.permissions?.length ? (
            <div className="flex flex-wrap gap-2 justify-center">
              {userInfo.permissions.map((tag, index) => (
                <motion.span
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'info', label: 'Инфо', icon: User },
          { id: 'history', label: 'История', icon: Clock },
          { id: 'notes', label: 'Заметки', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as 'info' | 'history' | 'notes')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Контактная информация</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Mail size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{userInfo?.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Phone size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{userInfo?.profile?.phone || '+7 (___) ___-__-__'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <MapPin size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{userInfo?.profile?.department || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Информация об аккаунте</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Calendar size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      С нами с {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Star size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Роль: {userInfo?.role || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900 dark:text-white">История обращений</h4>
              <div className="space-y-3">
                {history.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 dark:text-blue-400">
                        {getHistoryIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.description}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getHistoryStatusColor(item.status)}`}>
                            {item.status === 'resolved' ? 'Решено' : 
                             item.status === 'pending' ? 'В работе' : 'Закрыто'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.date}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify_between">
                <h4 className="font-medium text-gray-900 dark:text-white">Заметки оператора</h4>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                >
                  <Plus size={16} />
                </motion.button>
              </div>
              
              {loading && (
                <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка заметок...</div>
              )}
              {error && (
                <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
              )}

              <div className="space-y-3">
                {notes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-l-4 border-blue-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.createdAt).toLocaleString('ru-RU')}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{note.authorName}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                  </motion.div>
                ))}
                {!notes.length && !loading && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Пока нет заметок</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
