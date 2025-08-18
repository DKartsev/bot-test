"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, MessageCircle, Users, Clock, Activity } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import BackendStatus from "../../components/BackendStatus";

interface Metrics {
	conversationsTotal: number;
	openConversations: number;
	avgResponseTimeSec: number;
	resolutionRate: number;
	botHandoffRate: number;
}

interface PeriodPoint {
	date: string;
	conversations: number;
	messages: number;
	avgResponseTimeSec: number;
}

interface OperatorMetric {
	operator: string;
	handled: number;
	avgResponseTimeSec: number;
	csat?: number;
}

export default function MetricsPage() {
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [period, setPeriod] = useState<PeriodPoint[]>([]);
	const [operators, setOperators] = useState<OperatorMetric[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);

				const [mRes, pRes, oRes] = await Promise.all([
					api("/admin/metrics"),
					api("/admin/metrics/period"),
					api("/admin/metrics/operators"),
				]);

				if (!mRes.ok || !pRes.ok || !oRes.ok) throw new Error("HTTP error");

				const mData = await mRes.json();
				const pData = await pRes.json();
				const oData = await oRes.json();

				setMetrics(mData.data || mData);
				setPeriod(pData.data || pData);
				setOperators(oData.data || oData);
			} catch (e: any) {
				setError(e?.message || "Не удалось загрузить метрики");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	return (
		<AuthGuard>
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<BackendStatus className="absolute top-4 right-4 z-50 w-80" />

				<div className="max-w-6xl mx-auto px-4 py-6">
					<div className="flex items-center gap-3 mb-6">
						<BarChart3 className="text-blue-600" />
						<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Метрики</h1>
					</div>

					{loading && (
						<div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
					)}
					{error && (
						<div className="text-red-500">{error}</div>
					)}

					{!loading && !error && metrics && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
							{/* Всего диалогов */}
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Всего диалогов</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.conversationsTotal}</div>
									</div>
									<MessageCircle className="text-blue-600" />
								</div>
							</motion.div>

							{/* Открытые */}
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Открытые</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.openConversations}</div>
									</div>
									<Activity className="text-green-600" />
								</div>
							</motion.div>

							{/* Среднее время ответа */}
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Среднее время ответа</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{Math.round(metrics.avgResponseTimeSec)}с</div>
									</div>
									<Clock className="text-yellow-600" />
								</div>
							</motion.div>

							{/* Доля эскалаций к оператору */}
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Эскалации к оператору</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{Math.round(metrics.botHandoffRate * 100)}%</div>
									</div>
									<Users className="text-purple-600" />
								</div>
							</motion.div>
						</div>
					)}

					{/* Динамика по дням */}
					{!loading && !error && period.length > 0 && (
						<div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Динамика за период</h2>
								<span className="text-sm text-gray-500 dark:text-gray-400">{period[0]?.date} — {period[period.length-1]?.date}</span>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Простая колонная визуализация */}
								<div>
									<div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Диалоги</div>
									<div className="flex items-end gap-2 h-32">
										{period.map((p, idx) => (
											<div key={idx} className="flex-1 bg-blue-500/20 dark:bg-blue-500/30 rounded-md">
												<div className="bg-blue-600 dark:bg-blue-500 rounded-md" style={{ height: `${Math.min(100, (p.conversations || 1) * 6)}%` }} />
											</div>
										))}
									</div>
								</div>
								<div>
									<div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Сообщения</div>
									<div className="flex items-end gap-2 h-32">
										{period.map((p, idx) => (
											<div key={idx} className="flex-1 bg-green-500/20 dark:bg-green-500/30 rounded-md">
												<div className="bg-green-600 dark:bg-green-500 rounded-md" style={{ height: `${Math.min(100, (p.messages || 1) * 4)}%` }} />
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Операторы */}
					{!loading && !error && operators.length > 0 && (
						<div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Операторы</h2>
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm">
									<thead className="text-left text-gray-500 dark:text-gray-400">
										<tr>
											<th className="py-2 pr-6">Оператор</th>
											<th className="py-2 pr-6">Диалогов</th>
											<th className="py-2 pr-6">Средн. ответ</th>
											<th className="py-2 pr-6">CSAT</th>
										</tr>
									</thead>
									<tbody className="text-gray-900 dark:text-gray-100">
										{operators.map((op, idx) => (
											<tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
												<td className="py-2 pr-6">{op.operator}</td>
												<td className="py-2 pr-6">{op.handled}</td>
												<td className="py-2 pr-6">{Math.round(op.avgResponseTimeSec)}с</td>
												<td className="py-2 pr-6">{op.csat != null ? `${Math.round(op.csat * 100)}%` : '—'}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</AuthGuard>
	);
}
