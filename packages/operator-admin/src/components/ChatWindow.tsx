'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Info, ChevronDown } from 'lucide-react';
import { useChats, type Message as ChatMessage, type Chat } from '../hooks/useChats';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface ChatWindowProps {
	selectedChatId?: string;
	onSendMessage?: (message: string) => void;
}

export default function ChatWindow({ selectedChatId, onSendMessage }: ChatWindowProps) {
	const [message, setMessage] = useState('');
	const [isFetching, setIsFetching] = useState(false);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { success, error: toastError } = useToast();

	const { messages, fetchMessages, sendMessage, chats, error, updateChatStatus } = useChats();

	const selectedChat: Chat | undefined = chats.find((c) => c.id === selectedChatId);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => { scrollToBottom(); }, [messages]);

	useEffect(() => {
		const load = async () => {
			if (!selectedChatId) return;
			setIsFetching(true);
			try { await fetchMessages(selectedChatId); } finally { setIsFetching(false); }
		};
		load();
	}, [selectedChatId, fetchMessages]);

	const handleSendMessage = async () => {
		if (!message.trim() || !selectedChatId) return;
		const text = message.trim();
		setMessage('');
		await sendMessage(selectedChatId, text);
		if (onSendMessage) onSendMessage(text);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
	};

	async function uploadFiles(files: FileList | null) {
		if (!files || !selectedChatId) return;
		try {
			const form = new FormData();
			Array.from(files).forEach(f => form.append('files', f));
			const res = await api(`/admin/conversations/${selectedChatId}/attachments`, { method: 'POST', body: form });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			success('Файл(ы) загружены');
		} catch (e: any) {
			toastError('Ошибка загрузки', e?.message || 'Не удалось загрузить файл');
		}
	}

	const onDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		await uploadFiles(e.dataTransfer.files);
	};

	const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
	const onDragLeave = () => setIsDragging(false);

	const getMessageStyle = (role: ChatMessage['role']) => {
		switch (role) {
			case 'user': return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white ml-auto max-w-xs';
			case 'assistant': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 max-w-xs';
			case 'operator': return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 ml-auto max-w-xs';
			default: return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white';
		}
	};

	const statusLabel = (status?: Chat['status']) => {
		switch (status) {
			case 'open': return 'Открыт';
			case 'in_progress': return 'В работе';
			case 'closed': return 'Закрыт';
			case 'escalated': return 'Эскалирован';
			default: return 'Статус';
		}
	};

	const handleChangeStatus = async (next: Chat['status']) => {
		if (!selectedChatId) return;
		setIsUpdatingStatus(true);
		try { await updateChatStatus(selectedChatId, next); } finally { setIsUpdatingStatus(false); }
	};

	if (!selectedChatId) {
		return (
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center text-gray-500 dark:text-gray-400">
					<div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
						<Send size={32} className="text-gray-400" />
					</div>
					<h3 className="text-xl font-medium mb-2">Выберите диалог</h3>
					<p className="text-sm">Выберите диалог из списка слева, чтобы начать общение</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col bg-white dark:bg-gray-900">
			{/* Chat Header */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
							{(selectedChat?.customerName || selectedChat?.title || '—').charAt(0)}
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">{selectedChat?.customerName || selectedChat?.title || 'Не выбран'}</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(selectedChat?.status)}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<button className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
									{isUpdatingStatus ? 'Изменение...' : statusLabel(selectedChat?.status)}
									<ChevronDown size={16} />
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content className="min-w-[160px] p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
								{([
									{ id: 'open', label: 'Открыт' },
									{ id: 'in_progress', label: 'В работе' },
									{ id: 'escalated', label: 'Эскалирован' },
									{ id: 'closed', label: 'Закрыт' }
								] as const).map((opt) => (
									<DropdownMenu.Item key={opt.id} onSelect={() => handleChangeStatus(opt.id)} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer">
										{opt.label}
									</DropdownMenu.Item>
								))}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Phone size={20} /></motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Video size={20} /></motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Info size={20} /></motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><MoreVertical size={20} /></motion.button>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} className={`flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 ${isDragging ? 'ring-2 ring-blue-500' : ''}`}>
				{isFetching && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 text-gray-500 dark:text-gray-400"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>Загрузка сообщений...</motion.div>)}
				{!isFetching && error && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 text-red-500 dark:text-red-400">Произошла ошибка при загрузке сообщений</motion.div>)}
				{!isFetching && !error && (
					<AnimatePresence>
						{messages.map((msg, index) => (
							<motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2, delay: index * 0.05 }} className={`mb-4 flex ${msg.role === 'operator' ? 'justify-end' : 'justify-start'}`}>
								<div className={`flex flex-col ${msg.role === 'operator' ? 'items-end' : 'items-start'}`}>
									<div className={`px-4 py-3 rounded-2xl ${getMessageStyle(msg.role)} shadow-sm`}>
										<p className="text-sm leading-relaxed">{msg.content}</p>
									</div>
									<div className="flex items-center gap-2 mt-2">
										<span className="text-xs text-gray-500 dark:text-gray-400">{msg.role === 'user' ? 'Клиент' : msg.role === 'assistant' ? 'Бот' : 'Оператор'}</span>
										<span className="text-xs text-gray-400 dark:text-gray-500">{new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
										{msg.role === 'operator' && (<span className="text-xs text-gray-400 dark:text-gray-500">{msg.isRead ? '✓✓' : '✓'}</span>)}
									</div>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Message Input */}
			<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<div className="flex items-end gap-3">
					<input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
					<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors" onClick={() => fileInputRef.current?.click()}>
						<Paperclip size={20} />
					</motion.button>
					<div className="flex-1 relative">
						<textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Введите сообщение..." rows={1} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" style={{ minHeight: '48px', maxHeight: '120px' }} />
					</div>
					<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSendMessage} disabled={!message.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"><Send size={20} /></motion.button>
					<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Smile size={20} /></motion.button>
				</div>
			</div>
		</motion.div>
	);
}
