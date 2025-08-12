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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Уведомления</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={sound} 
                onChange={handleSound}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Звук при новых сообщениях</span>
            </label>
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={desktop} 
                onChange={handleDesktop}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Desktop-уведомления</span>
            </label>
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={assigned} 
                onChange={handleAssigned}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Уведомлять, когда мне назначен чат</span>
            </label>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Профиль</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Имя оператора
            </label>
            <input
              type="text"
              value={name}
              onChange={handleName}
              className="w-full max-w-sm border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Введите ваше имя"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
