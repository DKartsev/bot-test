'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import BackendStatus from '../../components/BackendStatus';
import ChatInterface from '../../components/ChatInterface';
import { connectSSE } from '../../lib/stream';
import { api } from '../../lib/api';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api('/conversations');
        if (response.ok) {
          const data = await response.json();
          setConversations(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    const stream = connectSSE();
    return () => {
      stream.close();
    };
  }, []);

  return (
    <AuthGuard>
      <div className="h-screen">
        {/* Статус интеграции с backend */}
        <BackendStatus className="absolute top-4 right-4 z-50 w-80" />
        
        {/* Основной интерфейс чата */}
        <ChatInterface />
      </div>
    </AuthGuard>
  );
}

