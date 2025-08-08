'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@shadcn/ui/card';
import { useConversations } from '../hooks/useConversations';

export default function ChatList() {
  const { conversations, isLoading, error } = useConversations();

  if (isLoading) {
    return <p>Загрузка...</p>;
  }

  if (error) {
    return <p className="text-red-500">Ошибка загрузки</p>;
  }

  return (
    <div className="space-y-2">
      {conversations?.map((conv: any) => (
        <Card key={conv.id}>
          <Link href={`/conversations/${conv.id}`}>
            <CardHeader>
              <CardTitle>{conv.title || `Диалог ${conv.id}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{conv.lastMessage?.content}</p>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}
