const fs = require('fs');
const path = require('path');
const {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  RichReply
} = require('matrix-bot-sdk');
const fetch = global.fetch;
const { liveBus } = require('../live/bus');
const { fuzzySearch } = require('../search/fuzzySearch');
const { logger } = require('../utils/logger');
const { auditLog, hashToken } = require('../utils/security');

function initMatrix() {
  const baseUrl = process.env.MATRIX_HOMESERVER_URL;
  const accessToken = process.env.MATRIX_ACCESS_TOKEN;
  const room = process.env.MATRIX_ROOM_ID;
  const storageDir = path.join(__dirname, '..', '..', 'data', 'matrix-storage');
  fs.mkdirSync(storageDir, { recursive: true });
  const storage = new SimpleFsStorageProvider(storageDir);
  const client = new MatrixClient(baseUrl, accessToken, storage);
  AutojoinRoomsMixin.setupOnClient(client);

  const allowed = (process.env.MATRIX_ALLOWED_MXIDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const rateWindow = parseInt(process.env.MATRIX_RATE_WINDOW_MS || '60000', 10);
  const rateMax = parseInt(process.env.MATRIX_RATE_MAX || '60', 10);
  const buckets = new Map();
  const state = new Map();

  function checkRate(sender) {
    const now = Date.now();
    let bucket = buckets.get(sender);
    if (!bucket) bucket = { tokens: rateMax, last: now };
    const delta = now - bucket.last;
    bucket.tokens = Math.min(rateMax, bucket.tokens + (delta / rateWindow) * rateMax);
    bucket.last = now;
    if (bucket.tokens < 1) {
      buckets.set(sender, bucket);
      return false;
    }
    bucket.tokens -= 1;
    buckets.set(sender, bucket);
    return true;
  }

  function isAllowed(sender) {
    return !allowed.length || allowed.includes(sender.toLowerCase());
  }

  async function send(roomId, event, text) {
    const content = event
      ? RichReply.createFor(roomId, event, text, text)
      : { body: text, msgtype: 'm.notice' };
    content.msgtype = 'm.notice';
    await client.sendMessage(roomId, content);
  }

  const apiBase = `http://localhost:${process.env.PORT || 3000}/admin`;
  const apiToken = process.env.OPERATOR_API_TOKEN;

  async function callAdmin(method, url, body) {
    const res = await fetch(`${apiBase}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  }

  async function getItem(id) {
    const list = await callAdmin('GET', '/qa');
    return list.find((i) => i.id === id);
  }

  function audit(action, ok, details, sender) {
    const req = {
      ip: 'matrix',
      method: 'MATRIX',
      path: action,
      auth: { role: 'matrix', tokenHash: hashToken(sender || 'matrix') }
    };
    try {
      auditLog(req, { action, ok, details });
    } catch (e) {
      logger.error({ err: e }, 'audit log failed');
    }
  }

  async function handleCommand(roomId, event, body) {
    const sender = event.sender;
    const [command, ...rest] = body.trim().split(/\s+/);
    switch (command) {
      case '/start':
        await send(
          roomId,
          event,
          'Commands: /pending, /approve <id>, /reject <id> [reason], /find <query>, /add, /edit <id>'
        );
        break;
      case '/pending':
        try {
          const pending = await callAdmin('GET', '/qa/pending');
          const lines = pending
            .slice(0, 10)
            .map((p) => `${p.id} — ${p.Question.slice(0, 80)}`);
          await send(roomId, event, lines.join('\n') || 'No pending');
          audit('mx.pending', true, { count: pending.length }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix pending');
          await send(roomId, event, 'Error fetching pending');
          audit('mx.pending', false, { error: err.message }, sender);
        }
        break;
      case '/approve':
        if (!rest[0]) {
          await send(roomId, event, 'Usage: /approve <id>');
          break;
        }
        try {
          await callAdmin('POST', `/qa/pending/${encodeURIComponent(rest[0])}/approve`, {});
          await send(roomId, event, `Approved ${rest[0]}`);
          audit('mx.approve', true, { id: rest[0] }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix approve');
          await send(roomId, event, `Error approving ${rest[0]}`);
          audit('mx.approve', false, { id: rest[0], error: err.message }, sender);
        }
        break;
      case '/reject':
        if (!rest[0]) {
          await send(roomId, event, 'Usage: /reject <id> [reason]');
          break;
        }
        try {
          const reason = rest.slice(1).join(' ');
          await callAdmin(
            'POST',
            `/qa/pending/${encodeURIComponent(rest[0])}/reject`,
            reason ? { reason } : {}
          );
          await send(roomId, event, `Rejected ${rest[0]}`);
          audit('mx.reject', true, { id: rest[0] }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix reject');
          await send(roomId, event, `Error rejecting ${rest[0]}`);
          audit('mx.reject', false, { id: rest[0], error: err.message }, sender);
        }
        break;
      case '/find':
        if (!rest.length) {
          await send(roomId, event, 'Usage: /find <query>');
          break;
        }
        const query = rest.join(' ');
        const results = fuzzySearch(query, 3);
        const linesFind = results.map(
          (r) => `${r.item.id} (${r.score.toFixed(3)}) ${r.item.Question.slice(0, 80)}`
        );
        await send(roomId, event, linesFind.join('\n') || 'No matches');
        audit('mx.find', true, { query }, sender);
        break;
      case '/add':
        state.set(sender, { action: 'add', step: 'question', data: {} });
        await send(roomId, event, 'Send question text');
        audit('mx.add', true, {}, sender);
        break;
      case '/edit':
        if (!rest[0]) {
          await send(roomId, event, 'Usage: /edit <id>');
          break;
        }
        try {
          const item = await getItem(rest[0]);
          if (!item) {
            await send(roomId, event, 'Not found');
            break;
          }
          state.set(sender, {
            action: 'edit',
            step: 'question',
            id: rest[0],
            data: {},
            original: item
          });
          await send(
            roomId,
            event,
            `Current question: ${item.Question}\nSend new question or '-' to keep`
          );
          audit('mx.edit', true, { id: rest[0] }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix edit');
          await send(roomId, event, 'Error fetching item');
          audit('mx.edit', false, { id: rest[0], error: err.message }, sender);
        }
        break;
      default:
        break;
    }
  }

  async function handleState(roomId, event, body) {
    const sender = event.sender;
    const st = state.get(sender);
    if (!st) return;
    if (st.action === 'add') {
      if (st.step === 'question') {
        st.data.Question = body;
        st.step = 'answer';
        await send(roomId, event, 'Send answer text');
      } else if (st.step === 'answer') {
        st.data.Answer = body;
        try {
          const res = await callAdmin('POST', '/qa', st.data);
          await send(roomId, event, `Added ${res.id}`);
          audit('mx.add.save', true, { id: res.id }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix add save');
          await send(roomId, event, 'Error adding');
          audit('mx.add.save', false, { error: err.message }, sender);
        }
        state.delete(sender);
      }
    } else if (st.action === 'edit') {
      if (st.step === 'question') {
        if (body.trim() !== '-') st.data.Question = body;
        st.step = 'answer';
        await send(
          roomId,
          event,
          `Current answer: ${st.original.Answer}\nSend new answer or '-' to keep`
        );
      } else if (st.step === 'answer') {
        if (body.trim() !== '-') st.data.Answer = body;
        if (Object.keys(st.data).length === 0) {
          await send(roomId, event, 'No changes');
          state.delete(sender);
          return;
        }
        try {
          await callAdmin('PUT', `/qa/${encodeURIComponent(st.id)}`, st.data);
          await send(roomId, event, `Updated ${st.id}`);
          audit('mx.edit.save', true, { id: st.id }, sender);
        } catch (err) {
          logger.error({ err }, 'matrix edit save');
          await send(roomId, event, 'Error updating');
          audit('mx.edit.save', false, { id: st.id, error: err.message }, sender);
        }
        state.delete(sender);
      }
    }
  }

  async function onMessage(roomId, event) {
    if (roomId !== room) return;
    if (!event.content || event.content.msgtype !== 'm.text') return;
    const sender = event.sender;
    const body = event.content.body || '';
    if (!isAllowed(sender)) {
      await send(roomId, event, 'Not authorized');
      return;
    }
    if (!checkRate(sender)) {
      await send(roomId, event, 'Rate limited');
      return;
    }
    if (state.has(sender) && !body.startsWith('/')) {
      await handleState(roomId, event, body);
      return;
    }
    if (!body.startsWith('/')) return;
    await handleCommand(roomId, event, body);
  }

  client.on('room.message', onMessage);

  async function sendNotice(text) {
    try {
      await client.sendMessage(room, { msgtype: 'm.notice', body: text });
    } catch (err) {
      logger.error({ err }, 'matrix send notice failed');
    }
  }

  function subscribeBus() {
    liveBus.on('ask', (p) => {
      let msg = `🆕 ASK ${p.lang} [${p.source}/${p.method}] — ${p.question}`;
      msg += `\nmatched: ${p.matchedQuestion || '-'} (score: ${p.score ?? '-'})`;
      msg += `\nIDs: item=${p.itemId || '-'} pending=${p.pendingId || '-'}`;
      if (p.pendingId) {
        msg += `\napprove: /approve ${p.pendingId} | reject: /reject ${p.pendingId}`;
      }
      sendNotice(msg);
    });
    liveBus.on('moderation', (p) => {
      if (p.action === 'approve') sendNotice(`✅ Approved ${p.id}`);
      else if (p.action === 'reject')
        sendNotice(`❌ Rejected ${p.id} — ${p.changes?.reason || ''}`);
      else sendNotice(`ℹ️ ${p.action} ${p.id}`);
    });
    liveBus.on('feedback', (p) => {
      sendNotice(`⭐ Feedback ${p.responseId}: +${p.positive}/${p.negative}/${p.neutral}`);
    });
  }

  subscribeBus();

  let ready = false;
  async function start() {
    await client.start();
    ready = true;
    logger.info('Matrix client started');
  }

  async function stop() {
    await client.stop();
    ready = false;
  }

  function isReady() {
    return ready;
  }

  return { start, stop, isReady };
}

module.exports = { initMatrix };
