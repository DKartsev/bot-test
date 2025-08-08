'use client';

import { useParams } from 'next/navigation';
import { ChatWindow } from '../../components/ChatWindow';
import { useMessages } from '../../hooks/useMessages';

export default function ConversationPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const { messages, isLoading, error, sendMessage } = useMessages(id);

  if (isLoading) {
    return <p>Загрузка...</p>;
  }

  if (error) {
    return <p className="text-red-500">Ошибка загрузки</p>;
  }

  return (
    <div className="h-full">
      <ChatWindow messages={messages || []} onSend={sendMessage} />
    </div>
  );
}
