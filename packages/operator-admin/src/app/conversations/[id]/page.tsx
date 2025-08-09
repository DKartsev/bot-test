'use client';

import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { Button } from '@shadcn/ui/button';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Диалог {id}</h1>
        <Button onClick={() => router.back()}>Назад</Button>
      </div>
    </AuthGuard>
  );
}

