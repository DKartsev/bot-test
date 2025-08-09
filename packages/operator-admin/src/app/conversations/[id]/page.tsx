'use client';

import AuthGuard from '../../../components/AuthGuard';
import ChatView from '../../../components/ChatView';
import MessageInput from '../../../components/MessageInput';

export default function ConversationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen p-4">
        <div className="flex-1 overflow-y-auto mb-4">
          <ChatView conversationId={id} />
        </div>
        <MessageInput conversationId={id} />
      </div>
    </AuthGuard>
  );
}
