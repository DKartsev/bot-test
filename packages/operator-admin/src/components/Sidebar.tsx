'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Filter,
  Plus,
  AlertCircle
} from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useChatContext } from '../context/ChatContext';
import type { Chat } from '../hooks/useChats';
import { api } from '../lib/api';

interface SidebarProps {
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

const filters = [
  { id: 'all', label: 'Все', icon: MessageCircle, count: 0 },
  { id: 'open', label: 'Открытые', icon: Clock, count: 0 },
  { id: 'in_progress', label: 'В работе', icon: CheckCircle, count: 0 },
  { id: 'closed', label: 'Закрытые', icon: XCircle, count: 0 },
  { id: 'escalated', label: 'Эскалированы', icon: AlertCircle, count: 0 }
];

const priorities = [
  { id: 'all', label: 'Любой' },
  { id: 'low', label: 'Низкий' },
  { id: 'medium', label: 'Средний' },
  { id: 'high', label: 'Высокий' },
];

export default function Sidebar({ onChatSelect, selectedChatId }: SidebarProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<{ id: string; name: string }[]>([]);
  
  const { chats, loading, error, applyFilters } = useChatContext();

  // Load options
  useEffect(() => {
    (async () => {
      try {
        const [catsRes, usersRes] = await Promise.all([
          api('/admin/categories'),
          api('/admin/users'),
        ]);
        if (catsRes.ok) {
          const cats = await catsRes.json();
          const items = (cats.data || cats || []).map((c: any) => ({ id: c.id?.toString?.() || c.id, name: c.name || c.title || c.label || 'Категория' }));
          setCategoryOptions([{ id: 'all', name: 'Все категории' }, ...items]);
        }
        if (usersRes.ok) {
          const users = await usersRes.json();
          const items = (users.data || users || []).map((u: any) => ({ id: u.id?.toString?.() || u.id, name: u.fullName || u.username || u.name || 'Оператор' }));
          setAssigneeOptions([{ id: 'all', name: 'Любой оператор' }, ...items]);
        }
      } catch {}
    })();
  }, []);

  // Update counters for quick chips
  useEffect(() => {
    const counts = {
      all: chats.length,
      open: chats.filter(chat => chat.status === 'open').length,
      in_progress: chats.filter(chat => chat.status === 'in_progress').length,
      closed: chats.filter(chat => chat.status === 'closed').length,
      escalated: chats.filter(chat => chat.status === 'escalated').length
    };

    filters.forEach(filter => {
      filter.count = counts[filter.id as keyof typeof counts] || 0;
    });
  }, [chats]);

  // Apply filters
  useEffect(() => {
    const newFilters: any = {};
    if (activeFilter !== 'all') newFilters.status = activeFilter;
    if (searchQuery) newFilters.search = searchQuery;
    if (category !== 'all') newFilters.category = category;
    if (priority !== 'all') newFilters.priority = priority;
    if (assignee !== 'all') newFilters.assignedTo = assignee;
    applyFilters(newFilters);
  }, [activeFilter, searchQuery, category, priority, assignee, applyFilters]);

  const filteredChats = chats;

  const getStatusColor = (status: Chat['status']) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'closed': return 'bg-gray-500';
      case 'escalated': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: Chat['status']) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'in_progress': return 'В работе';
      case 'closed': return 'Закрыт';
      case 'escalated': return 'Эскалирован';
    }
    return 'Неизвестно';
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Диалоги
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Поиск по диалогам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters quick chips */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Фильтры</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            
            return (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={14} />
                {filter.label}
                <span className={`px-2 py-1 rounded-full text-xs ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {filter.count}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Advanced filters */}
        <div className="space-y-2">
          {/* Category */}
          <Select.Root value={category} onValueChange={setCategory}>
            <Select.Trigger className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <Select.Value placeholder="Категория" />
            </Select.Trigger>
            <Select.Content className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
              {(categoryOptions.length ? categoryOptions : [{ id: 'all', name: 'Все категории' }]).map(opt => (
                <Select.Item key={opt.id} value={opt.id} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                  <Select.ItemText>{opt.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          {/* Priority */}
          <Select.Root value={priority} onValueChange={setPriority}>
            <Select.Trigger className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <Select.Value placeholder="Приоритет" />
            </Select.Trigger>
            <Select.Content className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
              {priorities.map(opt => (
                <Select.Item key={opt.id} value={opt.id} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                  <Select.ItemText>{opt.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          {/* Assignee */}
          <Select.Root value={assignee} onValueChange={setAssignee}>
            <Select.Trigger className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              <Select.Value placeholder="Оператор" />
            </Select.Trigger>
            <Select.Content className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
              {(assigneeOptions.length ? assigneeOptions : [{ id: 'all', name: 'Любой оператор' }]).map(opt => (
                <Select.Item key={opt.id} value={opt.id} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                  <Select.ItemText>{opt.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Загрузка диалогов...</p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-red-500 dark:text-red-400"
          >
            <AlertCircle size={48} className="mx-auto mb-4" />
            <p className="mb-2">Ошибка загрузки</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </motion.div>
        )}

        {/* Chat List */}
        {!loading && !error && (
          <AnimatePresence>
            {filteredChats.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChatSelect(chat.id)}
                className={`mb-3 p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                  selectedChatId === chat.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {(chat.customerName || chat.title).charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(chat.status)} rounded-full border-2 border-white dark:border-gray-900`} />
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {chat.customerName || chat.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chat.updatedAt).toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                      {chat.lastMessage || chat.title}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        chat.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        chat.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        chat.status === 'escalated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {getStatusLabel(chat.status)}
                      </span>
                      
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center"
                        >
                          {chat.unreadCount}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Empty State */}
        {!loading && !error && filteredChats.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Диалоги не найдены</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
