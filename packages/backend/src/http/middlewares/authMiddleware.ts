import { FastifyReply, FastifyRequest } from "fastify";

export function checkAdmin(req: FastifyRequest, reply: FastifyReply, done: () => void) {
    const userRole = (req.headers["x-user-role"] as string) || ""; // приводим к строке
    if (userRole !== "admin") {
        reply.status(403).send({ error: "Forbidden" });
        return;
    }
    done();
}

export function checkRole(allowedRoles: string[]) {
    return function(req: FastifyRequest, reply: FastifyReply, done: () => void) {
        const userRole = (req.headers["x-user-role"] as string) || ""; // приводим к строке
        if (!allowedRoles.includes(userRole)) {
            reply.status(403).send({ error: "Forbidden" });
            return;
        }
        done();
    };
}
