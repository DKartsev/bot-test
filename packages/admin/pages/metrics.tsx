import { useEffect, useState, useCallback } from "react";

export default function MetricsPage() {
	const [token, setToken] = useState<string>("");
	const [data, setData] = useState<any | null>(null);
	const [loading, setLoading] = useState(false);
	const [host, setHost] = useState("");

	useEffect(() => {
		if (typeof window !== "undefined") {
			const t = localStorage.getItem("admin_token") || "";
			setToken(t);
			setHost(window.location.origin.replace(/\/admin$/, ""));
		}
	}, []);

	const fetchData = useCallback(async () => {
		if (!token) { alert("Введите токен администратора"); return; }
		if (!host) { alert("Host не определён"); return; }
		setLoading(true);
		try {
			const res = await fetch(`${host}/api/admin/stats/rag`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) {
				const err = await res.text();
				throw new Error(`Ошибка сервера: ${err}`);
			}
			const json = await res.json();
			setData(json);
			localStorage.setItem("admin_token", token);
		} catch (e: any) {
			alert(e?.message || "Ошибка запроса");
		} finally {
			setLoading(false);
		}
	}, [token, host]);

	const totals = data?.totals || {};
	const daily = Array.isArray(data?.daily) ? data.daily : [];

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<h1 className="text-2xl font-semibold mb-4">RAG метрики</h1>

			<div className="flex gap-2 items-end mb-6">
				<div className="flex-1">
					<label className="block text-sm mb-1">Admin Token</label>
					<input
						className="w-full border rounded-lg p-2"
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="Вставьте ADMIN_API_TOKENS"
					/>
				</div>
				<button
					className="px-4 py-2 rounded-xl shadow border"
					disabled={loading}
					onClick={fetchData}
				>
					{loading ? "Загрузка..." : "Обновить"}
				</button>
			</div>

			<div className="grid grid-cols-3 gap-3 mb-6">
				<Card title="Ответов (30д)" value={Number(totals.total_responses ?? 0)} />
				<Card title="Средняя уверенность" value={isFinite(Number(totals.avg_conf)) ? Number(totals.avg_conf).toFixed(2) : "—"} />
				<Card title="Эскалаций (30д)" value={Number(totals.total_escalations ?? 0)} />
			</div>

			<div className="overflow-x-auto border rounded-xl">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="bg-gray-50">
							<th className="p-2 text-left">День</th>
							<th className="p-2 text-left">Ответов</th>
							<th className="p-2 text-left">Уверенность</th>
							<th className="p-2 text-left">Эскалации</th>
							<th className="p-2 text-left">Полезность</th>
						</tr>
					</thead>
					<tbody>
						{daily.map((d: any, i: number) => (
							<tr key={i} className="border-t">
								<td className="p-2">
									{d.day && !isNaN(Date.parse(d.day))
										? new Date(d.day).toLocaleDateString()
										: "—"}
								</td>
								<td className="p-2">{Number(d.responses ?? 0)}</td>
								<td className="p-2">{isFinite(Number(d.avg_conf)) ? Number(d.avg_conf).toFixed(2) : "—"}</td>
								<td className="p-2">{Number(d.escalations ?? 0)}</td>
								<td className="p-2">
									{d.helpful_rate !== undefined && d.helpful_rate !== null
										? `${(Number(d.helpful_rate) * 100).toFixed(0)}%`
										: "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<p className="text-xs text-gray-500 mt-4">
				Токен хранится локально в браузере. Эндпоинт требует Bearer/x-admin-token.
			</p>
		</div>
	);
}

function Card({ title, value }: { title: string; value: any }) {
	return (
		<div className="rounded-2xl border p-4 shadow-sm">
			<div className="text-sm text-gray-500">{title}</div>
			<div className="text-xl font-semibold">{String(value)}</div>
		</div>
	);
}