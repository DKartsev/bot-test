"use client";

import { createContext, useContext, useCallback, useMemo, useState, PropsWithChildren } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
	id: string;
	type: ToastType;
	title?: string;
	description?: string;
	durationMs?: number;
}

interface ToastContextValue {
	addToast: (toast: Omit<ToastItem, 'id'>) => void;
	success: (title: string, description?: string) => void;
	error: (title: string, description?: string) => void;
	info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren<{}>) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const duration = toast.durationMs ?? 3500;
		setToasts((prev) => [...prev, { ...toast, id }]);
		if (duration > 0) {
			setTimeout(() => removeToast(id), duration);
		}
	}, [removeToast]);

	const api = useMemo<ToastContextValue>(() => ({
		addToast,
		success: (title, description) => addToast({ type: 'success', title, description }),
		error: (title, description) => addToast({ type: 'error', title, description }),
		info: (title, description) => addToast({ type: 'info', title, description }),
	}), [addToast]);

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
				<AnimatePresence initial={false}>
					{toasts.map((t) => (
						<motion.div
							key={t.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.2 }}
							className={`pointer-events-auto min-w-[260px] max-w-sm rounded-2xl border p-3 shadow-lg backdrop-blur text-sm
								${t.type === 'success' ? 'bg-white/90 dark:bg-gray-800/80 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200' : ''}
								${t.type === 'error' ? 'bg-white/90 dark:bg-gray-800/80 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200' : ''}
								${t.type === 'info' ? 'bg-white/90 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200' : ''}
							`}
						>
							{t.title && <div className="font-medium mb-0.5">{t.title}</div>}
							{t.description && <div className="opacity-90">{t.description}</div>}
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useToast must be used within ToastProvider');
	return ctx;
}
