'use client';

import Image from 'next/image';

interface Props {
  message: {
    id: string;
    role: 'user' | 'bot' | 'operator';
    content: string;
    created_at: string;
    media_url?: string;
  };
}

export function MessageItem({ message }: Props) {
  const { role, content, created_at, media_url } = message;
  const bg = role === 'operator' ? 'bg-blue-100' : role === 'bot' ? 'bg-green-100' : 'bg-gray-100';

  return (
    <div className={`p-2 rounded ${bg}`}>
      <div className="text-xs text-gray-600 mb-1">
        {new Date(created_at).toLocaleString()} — {role}
      </div>
      <div>{content}</div>
      {media_url && (
        <div className="mt-2">
          <Image src={media_url} alt="media" width={200} height={200} />
        </div>
      )}
    </div>
  );
}
