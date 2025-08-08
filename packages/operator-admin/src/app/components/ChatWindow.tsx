'use client';

import { useState } from 'react';
import { MessageItem } from './MessageItem';
import { Button } from '@shadcn/ui/button';
import { Input } from '@shadcn/ui/input';

interface Props {
  messages: any[];
  onSend: (content: string) => Promise<void>;
  loading?: boolean;
}

export function ChatWindow({ messages, onSend, loading }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSend(text);
      setText('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages?.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответ..."
        />
        <Button type="submit" disabled={loading}>
          Отправить
        </Button>
      </form>
    </div>
  );
}
