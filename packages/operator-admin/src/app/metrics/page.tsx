"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { motion } from "framer-motion";
import { BarChart3, MessageCircle, Users, Clock, Activity } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import BackendStatus from "../../components/BackendStatus";
import * as Select from '@radix-ui/react-select';

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
	const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');

	async function loadAll() {
		try {
			setLoading(true);
			setError(null);
			const q = `?range=${range}`;
			const [mRes, pRes, oRes] = await Promise.all([
				api(`/admin/metrics${q}`),
				api(`/admin/metrics/period${q}`),
				api(`/admin/metrics/operators${q}`),
			]);
			if (!mRes.ok || !pRes.ok || !oRes.ok) throw new Error("HTTP error");
			setMetrics((await mRes.json()).data || (await mRes.json()));
			setPeriod((await pRes.json()).data || (await pRes.json()));
			setOperators((await oRes.json()).data || (await oRes.json()));
		} catch (e: any) {
			setError(e?.message || 'Не удалось загрузить метрики');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => { loadAll(); }, [range]);

	return (
		<AuthGuard>
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<BackendStatus className="absolute top-4 right-4 z-50 w-80" />

				<div className="max-w-6xl mx-auto px-4 py-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<BarChart3 className="text-blue-600" />
							<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Метрики</h1>
						</div>
						<Select.Root value={range} onValueChange={(v: any) => setRange(v)}>
							<Select.Trigger className="px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
								<Select.Value />
							</Select.Trigger>
							<Select.Content className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
								{['24h','7d','30d'].map(r => (
									<Select.Item key={r} value={r} className="px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
										<Select.ItemText>{r === '24h' ? '24 часа' : r === '7d' ? '7 дней' : '30 дней'}</Select.ItemText>
									</Select.Item>
								))}
							</Select.Content>
						</Select.Root>
					</div>

					{loading && (<div className="text-gray-500 dark:text-gray-400">Загрузка...</div>)}
					{error && (<div className="text-red-500">{error}</div>)}

					{/* cards + charts + table — как было выше */}
					{!loading && !error && metrics && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Всего диалогов</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.conversationsTotal}</div>
									</div>
									<MessageCircle className="text-blue-600" />
								</div>
							</motion.div>
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Открытые</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics.openConversations}</div>
									</div>
									<Activity className="text-green-600" />
								</div>
							</motion.div>
							<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-gray-500 dark:text-gray-400 text-sm">Среднее время ответа</div>
										<div className="text-2xl font-semibold text-gray-900 dark:text-white">{Math.round(metrics.avgResponseTimeSec)}с</div>
									</div>
									<Clock className="text-yellow-600" />
								</div>
							</motion.div>
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

					{!loading && !error && period.length > 0 && (
						<div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
