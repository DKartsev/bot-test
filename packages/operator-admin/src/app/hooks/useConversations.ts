'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Network error');
  return res.json();
});

export const useConversations = () => {
  const { data, error, isLoading, mutate } = useSWR('/conversations', fetcher);
  return {
    conversations: data,
    error,
    isLoading,
    mutate,
  };
};
