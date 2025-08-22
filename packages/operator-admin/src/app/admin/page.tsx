'use client';

import React from 'react';
import { ChatProvider } from '../../context/ChatContext';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { ChatList } from '../../components/ChatList';
import { ChatWindow } from '../../components/ChatWindow';
import { UserPanel } from '../../components/UserPanel';

function AdminPanelContent() {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className='flex h-screen'>
        {/* Sidebar */}
        <Sidebar />
        
        {/* Chat List */}
        <ChatList />
        
        {/* Chat Window */}
        <ChatWindow />
        
        {/* User Panel */}
        <UserPanel />
      </div>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <ChatProvider>
      <AdminPanelContent />
    </ChatProvider>
  );
}
