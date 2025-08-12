"use client";

import "./globals.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
    
    if (!token && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    router.push("/login");
  };

  if (loading) {
    return (
      <html lang="ru">
        <body className="min-h-screen flex items-center justify-center">
          <div>Загрузка...</div>
        </body>
      </html>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return (
      <html lang="ru">
        <body className="min-h-screen flex items-center justify-center">
          <div>Перенаправление...</div>
        </body>
      </html>
    );
  }
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        {isAuthenticated && pathname !== '/login' && (
          <header className="bg-gray-100 p-4 flex items-center justify-between border-b">
            <h1 className="font-bold text-xl">Операторская панель</h1>
            <nav className="flex gap-4 items-center">
              <Link 
                href="/conversations" 
                className={`px-3 py-2 rounded hover:bg-gray-200 ${
                  pathname.startsWith('/conversations') ? 'bg-gray-200' : ''
                }`}
              >
                Диалоги
              </Link>
              <Link 
                href="/ask-bot" 
                className={`px-3 py-2 rounded hover:bg-gray-200 ${
                  pathname === '/ask-bot' ? 'bg-gray-200' : ''
                }`}
              >
                Спросить у бота
              </Link>
              <Link 
                href="/settings" 
                className={`px-3 py-2 rounded hover:bg-gray-200 ${
                  pathname === '/settings' ? 'bg-gray-200' : ''
                }`}
              >
                Настройки
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Выход
              </button>
            </nav>
          </header>
        )}
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
