import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
<<<<<<< HEAD
import { AppError } from "../../../utils/errorHandler.js";

const adminCategoriesRoutes: FastifyPluginAsync = async (server, _opts) => {
=======
import { AppError, NotFoundError } from "../../utils/errorHandler.js";

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

const CreateCategorySchema = CategorySchema.omit({ id: true });
const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "At least one field must be provided for update." },
);

const adminCategoriesRoutes: FastifyPluginAsync = async (server) => {
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  // GET /categories
  server.get(
    "/categories",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw new AppError(error.message, 500);
      return { categories: data || [] };
    },
  );

  // POST /categories
  server.post(
    "/categories",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("categories")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /categories/:id
  server.patch(
    "/categories/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("categories")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /categories/:id
  server.delete(
    "/categories/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminCategoriesRoutes as any);
