'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Network error');
  return res.json();
});

export const useMessages = (id?: string) => {
  const { data, error, isLoading, mutate } = useSWR(id ? `/conversations/${id}/messages` : null, fetcher);

  const sendMessage = async (content: string) => {
    const res = await fetch(`/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Network error');
    mutate();
  };

  return { messages: data, error, isLoading, sendMessage };
};
