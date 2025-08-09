const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  TENANT_DEFAULT_ID = 'default',
  TENANT_QUOTA_REQUESTS_MONTH = 100000,
  TENANT_QUOTA_OPENAI_TOKENS_MONTH = 2000000,
  TENANT_QUOTA_RAG_MB = 512
} = process.env;

const tenantsDir = path.join(__dirname, '../../data/tenants');
const orgsPath = path.join(tenantsDir, 'orgs.json');

let cache = null;

function readOrgs() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(orgsPath, 'utf8');
    cache = JSON.parse(raw);
  } catch (e) {
    cache = [];
  }
  return cache;
}

function writeOrgs(orgs) {
  fs.mkdirSync(path.dirname(orgsPath), { recursive: true });
  const tmp = orgsPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(orgs, null, 2));
  fs.renameSync(tmp, orgsPath);
  cache = orgs;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function ensureDefaultTenant() {
  const orgs = readOrgs();
  if (!orgs.find(o => o.id === TENANT_DEFAULT_ID)) {
    const key = crypto.randomBytes(32).toString('base64url');
    const org = {
      id: TENANT_DEFAULT_ID,
      name: 'Default',
      createdAt: new Date().toISOString(),
      isDefault: true,
      projects: [{ id: 'root', name: 'root' }],
      apiKeys: [{
        id: crypto.randomUUID(),
        keyHash: hashKey(key),
        projectId: 'root',
        role: 'owner',
        createdAt: new Date().toISOString()
      }],
      members: [],
      quotas: {
        requestsMonth: Number(TENANT_QUOTA_REQUESTS_MONTH),
        openaiTokensMonth: Number(TENANT_QUOTA_OPENAI_TOKENS_MONTH),
        ragMB: Number(TENANT_QUOTA_RAG_MB)
      },
      usage: { requestsMonth: 0, openaiTokensMonth: 0, ragMB: 0 }
    };
    orgs.push(org);
    writeOrgs(orgs);
    console.log('Default API key:', key);
  }
}

function init() {
  fs.mkdirSync(tenantsDir, { recursive: true });
  ensureDefaultTenant();
  // migrate existing data
  const legacy = path.join(__dirname, '../../data/qa_pairs.json');
  const defaultDir = path.join(tenantsDir, TENANT_DEFAULT_ID);
  if (fs.existsSync(legacy)) {
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.renameSync(legacy, path.join(defaultDir, 'qa_pairs.json'));
  }
}

function listOrgs() {
  return readOrgs();
}

function getOrg(id) {
  return readOrgs().find(o => o.id === id);
}

function createOrg({ name }) {
  const orgs = readOrgs();
  const id = crypto.randomUUID();
  const org = {
    id,
    name,
    createdAt: new Date().toISOString(),
    projects: [{ id: 'root', name: 'root' }],
    apiKeys: [],
    members: [],
    quotas: {
      requestsMonth: Number(TENANT_QUOTA_REQUESTS_MONTH),
      openaiTokensMonth: Number(TENANT_QUOTA_OPENAI_TOKENS_MONTH),
      ragMB: Number(TENANT_QUOTA_RAG_MB)
    },
    usage: { requestsMonth: 0, openaiTokensMonth: 0, ragMB: 0 }
  };
  orgs.push(org);
  writeOrgs(orgs);
  return org;
}

function updateOrg(id, patch) {
  const orgs = readOrgs();
  const idx = orgs.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orgs[idx] = { ...orgs[idx], ...patch };
  writeOrgs(orgs);
  return orgs[idx];
}

function deleteOrg(id) {
  if (id === TENANT_DEFAULT_ID) throw new Error('cannot delete default org');
  const orgs = readOrgs();
  const idx = orgs.findIndex(o => o.id === id);
  if (idx === -1) return false;
  orgs.splice(idx, 1);
  writeOrgs(orgs);
  return true;
}

function createProject(orgId, { name }) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return null;
  const id = crypto.randomUUID();
  org.projects.push({ id, name });
  writeOrgs(orgs);
  return { id, name };
}

function deleteProject(orgId, projectId) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return false;
  const idx = org.projects.findIndex(p => p.id === projectId);
  if (idx === -1) return false;
  org.projects.splice(idx, 1);
  writeOrgs(orgs);
  return true;
}

function createApiKey(orgId, { projectId = 'root', role }) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return null;
  const id = crypto.randomUUID();
  const key = crypto.randomBytes(32).toString('base64url');
  org.apiKeys.push({ id, keyHash: hashKey(key), projectId, role, createdAt: new Date().toISOString() });
  writeOrgs(orgs);
  return { id, key };
}

function revokeApiKey(orgId, keyId) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return false;
  const key = org.apiKeys.find(k => k.id === keyId);
  if (!key) return false;
  key.revokedAt = new Date().toISOString();
  writeOrgs(orgs);
  return true;
}

function resolveApiKey(plaintext) {
  const orgs = readOrgs();
  const h = hashKey(plaintext);
  for (const org of orgs) {
    for (const key of org.apiKeys) {
      if (key.keyHash === h && !key.revokedAt) {
        return { orgId: org.id, projectId: key.projectId, role: key.role, keyId: key.id };
      }
    }
  }
  return null;
}

function setQuotas(orgId, quotas) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return false;
  org.quotas = { ...org.quotas, ...quotas };
  writeOrgs(orgs);
  return true;
}

function addUsage(orgId, deltas) {
  const orgs = readOrgs();
  const org = orgs.find(o => o.id === orgId);
  if (!org) return false;
  for (const k of Object.keys(deltas)) {
    org.usage[k] = (org.usage[k] || 0) + deltas[k];
  }
  writeOrgs(orgs);
  return true;
}

function getUsage(orgId) {
  const org = getOrg(orgId);
  return org ? org.usage : null;
}

function pathsForTenant(orgId, projectId) {
  const base = path.join(tenantsDir, orgId, projectId || 'root');
  return { basePath: base };
}

module.exports = {
  init,
  listOrgs,
  getOrg,
  createOrg,
  updateOrg,
  deleteOrg,
  createProject,
  deleteProject,
  createApiKey,
  revokeApiKey,
  resolveApiKey,
  setQuotas,
  addUsage,
  getUsage,
  pathsForTenant,
  TENANT_DEFAULT_ID
};
