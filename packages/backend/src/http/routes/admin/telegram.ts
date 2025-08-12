import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

/**
 * Админ-диагностика Telegram: getMe и ping (sendMessage).
 * Требует Authorization: Bearer <один из ADMIN_API_TOKENS>.
 * Не использует Telegraf, ходит напрямую в Telegram Bot API.
 */

const assertAdmin = (req: any) => {
	const hdr = (req.headers["authorization"] as string) || "";
	const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
	const x = (req.headers["x-admin-token"] as string) || bearer;
	const tokens = (process.env.ADMIN_API_TOKENS || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	if (!x || !tokens.includes(x)) {
		const err: any = new Error("unauthorized");
		err.statusCode = 401;
		throw err;
	}
};

const plugin: FastifyPluginAsync = async (app) => {
	const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
	if (!TOKEN) {
		app.log.warn("TELEGRAM_BOT_TOKEN is not set. /api/admin/telegram/* will 401.");
	}

	// GET /api/admin/telegram/getMe
	app.get("/api/admin/telegram/getMe", async (req, reply) => {
		try {
			assertAdmin(req);
		} catch {
			reply.code(401);
			return { error: "Unauthorized" };
		}
		if (!TOKEN) {
			reply.code(400);
			return { error: "NoBotToken" };
		}

		const url = `https://api.telegram.org/bot${TOKEN}/getMe`;
		try {
			const res = await fetch(url);
			const json = await res.json();
			return json;
		} catch (err: any) {
			app.log.error({ err }, "telegram getMe failed");
			reply.code(502);
			return { error: "UpstreamError" };
		}
	});

	// POST /api/admin/telegram/ping  { chatId: string, text?: string }
	const BodySchema = z.object({
		chatId: z.string().min(1),
		text: z.string().optional(),
	});

	app.post("/api/admin/telegram/ping", async (req, reply) => {
		try {
			assertAdmin(req);
		} catch {
			reply.code(401);
			return { error: "Unauthorized" };
		}
		if (!TOKEN) {
			reply.code(400);
			return { error: "NoBotToken" };
		}

		const parse = BodySchema.safeParse(req.body);
		if (!parse.success) {
			reply.code(400);
			return { error: "ValidationError", details: parse.error.flatten() };
		}
		const { chatId, text } = parse.data;

		const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
		const payload = {
			chat_id: chatId,
			text: text ?? `✅ Ping от сервера (${new Date().toISOString()})`,
		};

		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!(json as any)?.ok) {
				app.log.warn({ json }, "telegram ping not ok");
			}
			return json;
		} catch (err: any) {
			app.log.error({ err }, "telegram ping failed");
			reply.code(502);
			return { error: "UpstreamError" };
		}
	});
};

export default plugin;
