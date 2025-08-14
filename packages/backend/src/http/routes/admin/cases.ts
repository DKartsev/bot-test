import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../../utils/errorHandler.js";

const adminCasesRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /cases
  server.get(
    "/cases",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new AppError(error.message, 500);
      return { cases: data || [] };
    },
  );

  // POST /cases
  server.post(
    "/cases",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("cases")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /cases/:id
  server.patch(
    "/cases/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("cases")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /cases/:id
  server.delete(
    "/cases/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminCasesRoutes as any);
