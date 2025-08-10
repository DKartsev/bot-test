export function generateOpenApi() {
  return {
    openapi: '3.0.0',
    info: { title: 'API', version: '1.0.0' },
    servers: [{ url: '/' }],
    paths: {
      '/api/users': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' }
                  },
                  required: ['email', 'name']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Created' },
            '400': { description: 'Validation error' }
          }
        }
      }
    }
  } as const;
}
