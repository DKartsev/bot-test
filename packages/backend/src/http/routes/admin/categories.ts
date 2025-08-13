import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { supabase } from "../../../infra/db/connection.js";
import { AppError, NotFoundError } from "../../../utils/errorHandler.js";

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

const adminCategoriesRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /categories
  server.get("/categories", async (_req, _reply) => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, color")
      .order("name");
    if (error) throw new AppError(error.message, 500);
    return data;
  });

  // POST /categories
  server.post(
    "/categories",
    { schema: { body: CreateCategorySchema } },
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
    { schema: { body: UpdateCategorySchema } },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("categories")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      if (!data) throw new NotFoundError("category");
      return data;
    },
  );

  // DELETE /categories/:id
  server.delete("/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new AppError(error.message, 500);
    return reply.code(204).send();
  });
};

export default fp(adminCategoriesRoutes);
