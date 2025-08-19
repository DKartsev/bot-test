'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';

interface Question {
  id: string;
  question: string;
}

export default function RecommendedQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    api(`/admin/recommendations?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions || []))
      .catch(() => setQuestions([]));
  }, []);

  const sendFeedback = (id: string, liked: boolean) => {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) return;
    api('/admin/recommendations/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, question_id: id, action: liked ? 'feedback_like' : 'feedback_dislike' }),
    });
  };

  if (questions.length === 0) return null;

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-2">Рекомендуемые вопросы</h2>
      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="p-2 border rounded">
            <div className="mb-2">{q.question}</div>
            <div className="space-x-2">
              <Button size="sm" onClick={() => sendFeedback(q.id, true)}>Полезно</Button>
              <Button size="sm" variant="secondary" onClick={() => sendFeedback(q.id, false)}>Не полезно</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
