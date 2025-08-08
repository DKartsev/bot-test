import ChatList from '../components/ChatList';

export default function ConversationsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Диалоги</h1>
      <ChatList />
    </div>
  );
}
