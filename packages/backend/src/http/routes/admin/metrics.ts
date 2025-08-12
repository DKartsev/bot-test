import { FastifyPluginAsync } from "fastify";

function assertAdmin(req: any) {
	const hdr = (req.headers["authorization"] as string) || "";
	const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : undefined;
	const x = (req.headers["x-admin-token"] as string) || bearer;
	const tokens = (process.env.ADMIN_API_TOKENS || "").split(",").map((s) => s.trim()).filter(Boolean);
	if (!x || !tokens.includes(x)) {
		const err: any = new Error("unauthorized");
		err.statusCode = 401;
		throw err;
	}
}

const plugin: FastifyPluginAsync = async (app) => {
	app.get("/api/admin/stats/rag", async (req, reply) => {
		try {
			assertAdmin(req);
		} catch (e: any) {
			reply.code(401); return { error: "Unauthorized" };
		}

		const q = await app.pg.query(`
      with base as (
        select date_trunc('day', created_at) as day,
               count(*) as responses,
               avg(confidence) as avg_conf,
               sum(case when escalate then 1 else 0 end) as escalations
        from bot_responses
        where created_at >= now() - interval '30 days'
        group by 1
      ),
      fb as (
        select date_trunc('day', created_at) as day,
               avg(case when useful then 1 else 0 end)::float as helpful_rate
        from bot_feedback
        where created_at >= now() - interval '30 days'
        group by 1
      )
      select coalesce(b.day, f.day) as day,
             coalesce(b.responses, 0) as responses,
             coalesce(b.avg_conf, 0) as avg_conf,
             coalesce(b.escalations, 0) as escalations,
             coalesce(f.helpful_rate, 0) as helpful_rate
      from base b
      full join fb f on f.day = b.day
      order by 1 asc;
    `);

		const totals = await app.pg.query(`
      select
        count(*) as total_responses,
        avg(confidence) as avg_conf,
        sum(case when escalate then 1 else 0 end) as total_escalations
      from bot_responses
      where created_at >= now() - interval '30 days';
    `);

		return { daily: q.rows, totals: totals.rows[0] };
	});
};

export default plugin;
