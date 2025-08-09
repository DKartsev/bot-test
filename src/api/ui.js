const express = require('express');
const { authMiddleware } = require('../utils/security');
const { liveBus } = require('../live/bus');

const router = express.Router();

router.get('/ui', authMiddleware(['admin', 'editor']), (req, res) => {
  res.render('panel', { token: req.headers['authorization'] || '' });
});

const tokenFromQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

router.get(
  '/stream',
  tokenFromQuery,
  authMiddleware(['admin', 'editor']),
  (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const onAsk = (payload) => send('ask', payload);
    const onMod = (payload) => send('moderation', payload);
    const onFb = (payload) => send('feedback', payload);
    liveBus.on('ask', onAsk);
    liveBus.on('moderation', onMod);
    liveBus.on('feedback', onFb);

    const ping = setInterval(() => res.write('event: ping\ndata: {}\n\n'), 15000);

    req.on('close', () => {
      clearInterval(ping);
      liveBus.off('ask', onAsk);
      liveBus.off('moderation', onMod);
      liveBus.off('feedback', onFb);
    });
  }
);

module.exports = router;
