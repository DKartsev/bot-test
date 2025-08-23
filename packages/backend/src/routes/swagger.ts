import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiOptions } from '../config/swagger';
import { logInfo } from '../utils/logger';

const router = express.Router();

/**
 * Swagger UI - интерактивная документация
 */
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

/**
 * JSON спецификация OpenAPI
 */
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

/**
 * YAML спецификация OpenAPI
 */
router.get('/yaml', (req, res) => {
  const yaml = require('js-yaml');
  const yamlSpec = yaml.dump(swaggerSpec, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
  
  res.setHeader('Content-Type', 'text/yaml');
  res.setHeader('Content-Disposition', 'attachment; filename="openapi.yaml"');
  res.send(yamlSpec);
});

/**
 * HTML документация (альтернатива Swagger UI)
 */
router.get('/html', (req, res) => {
  const html = generateHtmlDocumentation(swaggerSpec);
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * Экспорт спецификации в различных форматах
 */
router.get('/export', (req, res) => {
  const format = req.query.format as string || 'json';
  
  switch (format.toLowerCase()) {
    case 'yaml':
      const yaml = require('js-yaml');
      const yamlSpec = yaml.dump(swaggerSpec, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
      
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', 'attachment; filename="openapi.yaml"');
      res.send(yamlSpec);
      break;
      
    case 'json':
    default:
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
      res.json(swaggerSpec);
      break;
  }
});

/**
 * Информация о версии API
 */
router.get('/info', (req, res) => {
  const spec = swaggerSpec as any; // Приведение типа для доступа к свойствам
  const info = {
    title: spec.info?.title || 'API Documentation',
    version: spec.info?.version || '1.0.0',
    description: spec.info?.description || 'API Documentation',
    servers: spec.servers || [],
    tags: spec.tags || [],
    paths: Object.keys(spec.paths || {}).length,
    schemas: Object.keys(spec.components?.schemas || {}).length,
    endpoints: countEndpoints(spec.paths || {}),
    lastGenerated: new Date().toISOString(),
  };
  
  res.json({
    success: true,
    data: info,
  });
});

/**
 * Поиск по API документации
 */
router.get('/search', (req, res) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.status(400).json({
      error: 'Необходимо указать параметр поиска q',
      code: 'MISSING_QUERY',
    });
  }
  
  const results = searchInSpecification(swaggerSpec, query);
  
  res.json({
    success: true,
    data: {
      query,
      results,
      total: results.length,
    },
  });
});

/**
 * Статистика API
 */
router.get('/stats', (req, res) => {
  const stats = generateApiStats(swaggerSpec);
  
  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Вспомогательные функции
 */
function generateHtmlDocumentation(spec: any): string {
  const { title, version, description, tags, paths } = spec;
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Документация</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5rem; font-weight: 300; }
        .header .version { font-size: 1.2rem; opacity: 0.9; margin-top: 10px; }
        .content { padding: 40px; }
        .description { font-size: 1.1rem; line-height: 1.6; color: #4a5568; margin-bottom: 40px; }
        .tags { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .tag { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .tag h3 { margin: 0 0 10px 0; color: #2d3748; }
        .tag p { margin: 0; color: #718096; }
        .endpoints { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .endpoints h3 { margin: 0 0 20px 0; color: #2d3748; }
        .endpoint { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-right: 10px; }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
        .put { background: #f59e0b; color: white; }
        .delete { background: #ef4444; color: white; }
        .path { font-family: monospace; color: #2d3748; }
        .summary { color: #718096; font-size: 0.9rem; margin-top: 5px; }
        .footer { text-align: center; padding: 20px; color: #718096; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="version">Версия ${version}</div>
        </div>
        
        <div class="content">
            <div class="description">
                ${description.replace(/\n/g, '<br>')}
            </div>
            
            <div class="tags">
                ${tags.map((tag: any) => `
                    <div class="tag">
                        <h3>${tag.name}</h3>
                        <p>${tag.description}</p>
                    </div>
                `).join('')}
            </div>
            
            <div class="endpoints">
                <h3>Доступные endpoints (${Object.keys(paths).length})</h3>
                ${Object.entries(paths).map(([path, methods]: [string, any]) => 
                    Object.entries(methods).map(([method, details]: [string, any]) => `
                        <div class="endpoint">
                            <span class="method ${method}">${method.toUpperCase()}</span>
                            <span class="path">${path}</span>
                            <div class="summary">${(details as any).summary || 'Описание отсутствует'}</div>
                        </div>
                    `).join('')
                ).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p>Документация сгенерирована автоматически | ${new Date().toLocaleDateString('ru-RU')}</p>
        </div>
    </div>
</body>
</html>`;
}

function countEndpoints(paths: any): number {
  let count = 0;
  for (const path in paths) {
    for (const method in paths[path]) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        count++;
      }
    }
  }
  return count;
}

function searchInSpecification(spec: any, query: string): any[] {
  const results: any[] = [];
  const queryLower = query.toLowerCase();
  
  // Поиск в путях
  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, details] of Object.entries(methods as any)) {
        const detail = details as any;
        if (
          path.toLowerCase().includes(queryLower) ||
          detail.summary?.toLowerCase().includes(queryLower) ||
          detail.description?.toLowerCase().includes(queryLower)
        ) {
          results.push({
            type: 'endpoint',
            path,
            method: method.toUpperCase(),
            summary: detail.summary,
            description: detail.description,
          });
        }
      }
    }
  }
  
  // Поиск в схемах
  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      const schemaObj = schema as any;
      if (
        name.toLowerCase().includes(queryLower) ||
        schemaObj.description?.toLowerCase().includes(queryLower)
      ) {
        results.push({
          type: 'schema',
          name,
          description: schemaObj.description,
        });
      }
    }
  }
  
  // Поиск в тегах
  if (spec.tags) {
    for (const tag of spec.tags) {
      if (
        tag.name.toLowerCase().includes(queryLower) ||
        tag.description?.toLowerCase().includes(queryLower)
      ) {
        results.push({
          type: 'tag',
          name: tag.name,
          description: tag.description,
        });
      }
    }
  }
  
  return results;
}

function generateApiStats(spec: any): any {
  const paths = spec.paths || {};
  const schemas = spec.components?.schemas || {};
  
  const methodCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  
  // Подсчет методов
  for (const path in paths) {
    for (const method in paths[path]) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      }
    }
  }
  
  // Подсчет тегов
  for (const path in paths) {
    for (const method in paths[path]) {
      const details = paths[path][method] as any;
      if (details.tags) {
        for (const tag of details.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
  }
  
  return {
    totalEndpoints: countEndpoints(paths),
    totalSchemas: Object.keys(schemas).length,
    totalTags: Object.keys(tagCounts).length,
    methodDistribution: methodCounts,
    tagDistribution: tagCounts,
    apiVersion: spec.info.version,
    openApiVersion: spec.openapi,
    lastGenerated: new Date().toISOString(),
  };
}

export default router;
