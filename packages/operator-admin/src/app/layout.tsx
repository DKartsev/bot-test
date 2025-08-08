import './globals.css';
import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <nav className="bg-gray-100 p-4 flex gap-4">
          <Link href="/">Главная</Link>
          <Link href="/conversations">Диалоги</Link>
          <Link href="/login">Вход</Link>
        </nav>
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
