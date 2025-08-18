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
			<body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
				{isAuthenticated && pathname !== '/login' && (
					<header className="bg-white dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
						<h1 className="font-semibold text-lg text-gray-900 dark:text-white">Операторская панель</h1>
						<nav className="flex gap-2 items-center">
							<Link 
								href="/conversations" 
								className={`px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 ${
									pathname.startsWith('/conversations') ? 'bg-gray-100 dark:bg-gray-800' : ''
								}`}
							>
								Диалоги
							</Link>
							<Link 
								href="/metrics" 
								className={`px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 ${
									pathname === '/metrics' ? 'bg-gray-100 dark:bg-gray-800' : ''
								}`}
							>
								Метрики
							</Link>
							<Link 
								href="/ask-bot" 
								className={`px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 ${
									pathname === '/ask-bot' ? 'bg-gray-100 dark:bg-gray-800' : ''
								}`}
							>
								Спросить у бота
							</Link>
							<Link 
								href="/settings" 
								className={`px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 ${
									pathname === '/settings' ? 'bg-gray-100 dark:bg-gray-800' : ''
								}`}
							>
								Настройки
							</Link>
							<button 
								onClick={handleLogout}
								className="ml-2 px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
							>
								Выход
							</button>
						</nav>
					</header>
				)}
				<main className="flex-1 p-0">{children}</main>
			</body>
		</html>
	);
}
