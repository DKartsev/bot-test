const orgStore = require('./orgStore');
const { TENANT_API_KEY_HEADER = 'X-API-Key', TENANT_ADMIN_HEADER = 'X-Tenant-Id' } = process.env;

function withTenantLogger(req, logger) {
  if (!req.tenant) return logger;
  return logger.child({ tenantId: req.tenant.orgId, projectId: req.tenant.projectId });
}

function tenantCtx() {
  return async function (req, res, next) {
    const isAdmin = req.originalUrl.startsWith('/admin');
    if (!isAdmin) {
      const key = req.header(TENANT_API_KEY_HEADER);
      if (key) {
        const resolved = orgStore.resolveApiKey(key);
        if (!resolved) return res.status(401).json({ error: 'invalid_api_key' });
        const paths = orgStore.pathsForTenant(resolved.orgId, resolved.projectId);
        req.tenant = { ...resolved, ...paths };
      } else {
        if (process.env.NODE_ENV !== 'production') {
          const paths = orgStore.pathsForTenant(orgStore.TENANT_DEFAULT_ID);
          req.tenant = { orgId: orgStore.TENANT_DEFAULT_ID, projectId: 'root', role: 'owner', ...paths };
        } else {
          return res.status(401).json({ error: 'missing_api_key' });
        }
      }
    } else {
      // admin path
      const tenantOverride = req.header(TENANT_ADMIN_HEADER) || orgStore.TENANT_DEFAULT_ID;
      const paths = orgStore.pathsForTenant(tenantOverride);
      req.tenant = { orgId: tenantOverride, projectId: 'root', role: 'owner', ...paths };
    }
    next();
  };
}

module.exports = { tenantCtx, withTenantLogger };
