'use client';

import { useEffect, useState } from 'react';
import { requestPermission } from '../../lib/notifications';

export default function SettingsPage() {
  const [sound, setSound] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    setSound(localStorage.getItem('soundOn') === '1');
    setDesktop(localStorage.getItem('desktopNotify') === '1');
    setAssigned(localStorage.getItem('notifyAssigned') === '1');
    setName(localStorage.getItem('operatorName') || '');
  }, []);

  const handleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setSound(val);
    localStorage.setItem('soundOn', val ? '1' : '0');
  };

  const handleDesktop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setDesktop(val);
    localStorage.setItem('desktopNotify', val ? '1' : '0');
    if (val) requestPermission();
  };

  const handleAssigned = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAssigned(val);
    localStorage.setItem('notifyAssigned', val ? '1' : '0');
  };

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    localStorage.setItem('operatorName', val);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Настройки</h1>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={sound} onChange={handleSound} />
        Звук при новых сообщениях
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={desktop} onChange={handleDesktop} />
        Desktop-уведомления
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={assigned} onChange={handleAssigned} />
        Уведомлять, когда мне назначен чат
      </label>
      <div>
        <label className="block mb-1">Имя оператора</label>
        <input
          type="text"
          value={name}
          onChange={handleName}
          className="border p-1 rounded w-full max-w-sm"
        />
      </div>
    </div>
  );
}
