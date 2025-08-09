const express = require('express');
const orgStore = require('../tenancy/orgStore');
const { auditLog } = require('../utils/security');

const router = express.Router();

router.get('/', (req, res) => {
  const orgs = orgStore.listOrgs();
  auditLog(req, { action: 'org.list', ok: true, details: { count: orgs.length } });
  res.json(orgs);
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    auditLog(req, { action: 'org.create', ok: false, details: { error: 'Missing name' } });
    return res.status(400).json({ error: 'Missing name' });
  }
  const org = orgStore.createOrg({ name });
  auditLog(req, { action: 'org.create', ok: true, details: { id: org.id } });
  res.status(201).json(org);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const patch = req.body || {};
  const org = orgStore.updateOrg(id, patch);
  if (!org) {
    auditLog(req, { action: 'org.update', ok: false, details: { id } });
    return res.status(404).json({ error: 'Not found' });
  }
  auditLog(req, { action: 'org.update', ok: true, details: { id } });
  res.json(org);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const ok = orgStore.deleteOrg(id);
    if (!ok) {
      auditLog(req, { action: 'org.delete', ok: false, details: { id } });
      return res.status(404).json({ error: 'Not found' });
    }
    auditLog(req, { action: 'org.delete', ok: true, details: { id } });
    res.json({ ok: true });
  } catch (err) {
    auditLog(req, { action: 'org.delete', ok: false, details: { id, error: err.message } });
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/keys', (req, res) => {
  const { id } = req.params;
  const { projectId, role } = req.body || {};
  if (!role) {
    auditLog(req, { action: 'org.key.create', ok: false, details: { id, error: 'Missing role' } });
    return res.status(400).json({ error: 'Missing role' });
  }
  const result = orgStore.createApiKey(id, { projectId, role });
  if (!result) {
    auditLog(req, { action: 'org.key.create', ok: false, details: { id } });
    return res.status(404).json({ error: 'Org not found' });
  }
  auditLog(req, { action: 'org.key.create', ok: true, details: { id, keyId: result.id } });
  res.status(201).json(result);
});

router.delete('/:id/keys/:keyId', (req, res) => {
  const { id, keyId } = req.params;
  const ok = orgStore.revokeApiKey(id, keyId);
  if (!ok) {
    auditLog(req, { action: 'org.key.delete', ok: false, details: { id, keyId } });
    return res.status(404).json({ error: 'Not found' });
  }
  auditLog(req, { action: 'org.key.delete', ok: true, details: { id, keyId } });
  res.json({ ok: true });
});

module.exports = router;
