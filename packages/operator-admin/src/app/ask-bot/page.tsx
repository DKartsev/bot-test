import AuthGuard from '../../components/AuthGuard';

export default function AskBotPage() {
  return (
    <AuthGuard>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Спросить у бота</h1>
      </div>
    </AuthGuard>
  );
}
