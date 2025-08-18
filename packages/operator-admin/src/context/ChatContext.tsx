"use client";

import { createContext, useContext, PropsWithChildren } from 'react';
import { useChats } from '../hooks/useChats';

const ChatContext = createContext<ReturnType<typeof useChats> | null>(null);

export function ChatProvider({ children }: PropsWithChildren<{}>) {
	const value = useChats();
	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
	const ctx = useContext(ChatContext);
	if (!ctx) {
		throw new Error('useChatContext must be used within ChatProvider');
	}
	return ctx;
}
