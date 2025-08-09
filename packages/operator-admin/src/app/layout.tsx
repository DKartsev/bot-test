"use client";

import "./globals.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <header className="bg-gray-100 p-4 flex items-center justify-between">
          <h1 className="font-bold">Операторская панель</h1>
          <nav className="flex gap-4 items-center">
            <Link href="/conversations">Диалоги</Link>
            <Link href="/ask-bot">Спросить у бота</Link>
            <button onClick={handleLogout}>Выход</button>
          </nav>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </body>
    </html>
  );
}
