export function generateOpenApi() {
  return {
    openapi: "3.0.0",
    info: { title: "API", version: "1.0.0" },
    servers: [{ url: "/" }],
    paths: {
      "/api/users": {
        get: {
          parameters: [
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              required: false,
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              required: false,
            },
          ],
          responses: {
            "200": {
              description: "List users",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            email: { type: "string", format: "email" },
                            name: { type: "string" },
                          },
                          required: ["id", "email", "name"],
                        },
                      },
                      nextCursor: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    name: { type: "string" },
                  },
                  required: ["email", "name"],
                },
              },
            },
          },
          responses: {
            "201": { description: "Created" },
            "400": { description: "Validation error" },
          },
        },
      },
    },
  } as const;
}
