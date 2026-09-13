import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.static(path.join(__dirname, 'public')));

const names = ['Алексей', 'Мария', 'Даниил', 'Екатерина', 'Илья', 'София'];
const surnames = ['Иванов', 'Петрова', 'Смирнов', 'Кузнецова', 'Орлов', 'Волкова'];
const kycStatuses = ['verified', 'pending_review', 'rejected', 'not_started'];
const fiatCurrencies = ['RUB', 'USDT', 'BTC', 'ETH'];
const cryptoNetworks = ['TRC20', 'ERC20', 'BEP20', 'TON', 'BTC'];
const depositMethods = ['sbp', 'p2p', 'crypto', 'office_cash'];
const withdrawalMethods = ['p2p', 'crypto', 'office_cash'];
const operationStatuses = ['processing', 'pending_confirmation', 'completed', 'failed', 'blocked', 'cancelled', 'manual_review'];
const counterparties = ['AlexPay', 'MarketMaker77', 'RubDesk', 'FastTrade', 'Rapira OTC'];

function hash(input) {
  return [...String(input || 'anonymous')].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

function pick(list, seed, offset = 0) {
  return list[((seed >>> 0) + offset) % list.length];
}

function money(seed, min, max) {
  return Number((min + ((seed >>> 0) % Math.round((max - min) * 100 + 1)) / 100).toFixed(2));
}

function cryptoAmount(seed, token) {
  const ranges = { BTC: [0.001, 0.25, 6], ETH: [0.01, 8, 4], TON: [10, 12000, 2], USDT: [10, 50000, 2] };
  const [min, max, precision] = ranges[token] || [1, 1000, 2];
  const value = min + ((seed >>> 0) % 100000) / 100000 * (max - min);
  return Number(value.toFixed(precision));
}

function processingMinutes(seed, min, max) {
  return min + ((seed >>> 0) % (max - min + 1));
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч. ${rest} мин.` : `${hours} ч.`;
}

function methodLabel(method) {
  return { sbp: 'СБП', p2p: 'P2P сделка', crypto: 'Криптовалюта', office_cash: 'Наличные в офисе' }[method] || method;
}

function hex(seed, prefix = '', length = 24) {
  const first = (seed >>> 0).toString(16).padStart(8, '0');
  const second = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0');
  const third = ((seed * 1597334677) >>> 0).toString(16).padStart(8, '0');
  return `${prefix}${first}${second}${third}`.slice(0, prefix.length + length);
}

function enrichOperation(operation, seed, index) {
  if (operation.method === 'p2p') {
    operation.deal_number = `P2P-${100000 + ((seed + index * 137) >>> 0) % 900000}`;
    operation.counterparty = pick(counterparties, seed, index);
    operation.fee = money(seed >>> (index % 8), 0, 1500);
  }

  if (operation.method === 'crypto') {
    const chain = operation.network.toLowerCase();
    operation.started_at = operation.created_at;
    operation.address = `${chain}_${hex(seed + index * 421, '', 28)}`;
    operation.deposit_address = operation.direction === 'deposit' ? operation.address : null;
    operation.withdrawal_address = operation.direction === 'withdrawal' ? operation.address : null;
    operation.hash = operation.txid;
  }

  return operation;
}

function buildOperation({ seed, index, direction, method, canWithdraw }) {
  const isCrypto = method === 'crypto';
  const shiftedSeed = seed >>> (index % 16);
  const token = isCrypto ? pick(['USDT', 'BTC', 'ETH', 'TON'], seed, index) : null;
  const currency = isCrypto ? token : 'RUB';
  const network = isCrypto ? pick(cryptoNetworks, seed, index) : null;
  const minutes = processingMinutes(shiftedSeed, 8, isCrypto ? 240 : 120);
  const status = direction === 'withdrawal' && !canWithdraw ? 'blocked' : pick(operationStatuses, seed, index + (direction === 'deposit' ? 1 : 4));
  const idPrefix = direction === 'deposit' ? 'dep' : 'wd';
  const txid = isCrypto && ['processing', 'pending_confirmation', 'completed'].includes(status) ? `tx_${hex(seed + index * 211, '', 18)}` : null;

  return enrichOperation({
    id: `${idPrefix}_${hex(seed + index * 97, '', 10)}`,
    txid,
    direction,
    type: direction,
    method,
    method_label: methodLabel(method),
    token,
    currency,
    network,
    amount: isCrypto ? cryptoAmount(shiftedSeed, token) : money(shiftedSeed, 1000, direction === 'deposit' ? 300000 : 250000),
    status,
    created_at: isoMinutesAgo(minutes),
    processing_minutes: minutes,
    processing_time_label: formatDuration(minutes)
  }, seed, index);
}

function buildOperations(seed, direction, canWithdraw) {
  const methods = direction === 'deposit' ? depositMethods : withdrawalMethods;
  const count = 1 + ((seed >>> (direction === 'deposit' ? 0 : 3)) % 3);
  return Array.from({ length: count }, (_, index) => buildOperation({
    seed,
    index,
    direction,
    method: pick(methods, seed, index),
    canWithdraw
  }));
}

function requestContext(req) {
  const contact = req.body?.contact || {};
  const custom = contact.custom_attributes || {};
  return {
    rapira_user_id: contact.rapira_user_id || custom.rapira_user_id || req.body?.rapira_user_id || '',
    account_id: contact.id || contact.account_id || custom.account_id || req.body?.account_id || req.query.account_id || req.query.contact_id || '',
    telegram_id: contact.telegram_id || custom.telegram_id || req.body?.telegram_id || req.query.telegram_id || '',
    identifier: contact.identifier || req.body?.identifier || '',
    email: contact.email || req.body?.email || req.query.email || req.get('X-Chatwoot-Contact-Email') || '',
    phone: contact.phone || req.body?.phone || req.query.phone || req.get('X-Chatwoot-Contact-Phone') || '',
    contact_id: contact.id || req.body?.contact_id || req.query.contact_id || req.get('X-Chatwoot-Contact-Id') || ''
  };
}

function buildUser(query = {}) {
  const identity = query.rapira_user_id || query.account_id || query.telegram_id || query.identifier || query.email || query.phone || query.contact_id;
  const seed = hash(identity);
  const kycStatus = pick(kycStatuses, seed, 2);
  const canWithdraw = kycStatus === 'verified';

  return {
    user: {
      id: query.account_id || query.rapira_user_id || `rp_${hex(seed, '', 8)}`,
      telegram_id: query.telegram_id || null,
      name: `${pick(names, seed)} ${pick(surnames, seed, 1)}`,
      email: query.email || `client-${seed % 10000}@example.com`,
      phone: query.phone || `+7 9${String(seed % 1000000000).padStart(9, '0')}`,
      registered_at: new Date(Date.now() - (seed % 900) * 86400000).toISOString(),
      language: 'ru'
    },
    account: {
      kyc_status: kycStatus,
      risk_level: pick(['low', 'medium', 'high'], seed, 3),
      two_factor_enabled: seed % 3 !== 0,
      withdrawal_enabled: canWithdraw,
      trading_enabled: kycStatus !== 'rejected',
      last_login_ip: `185.${seed % 255}.${(seed >>> 8) % 255}.${(seed >>> 16) % 255}`
    },
    balances: fiatCurrencies.map((currency, index) => ({
      currency,
      available: money(seed >>> index, index === 0 ? 0 : 1, index === 0 ? 400000 : 50000),
      locked: money(seed >>> (index + 3), 0, index === 0 ? 50000 : 5000)
    })),
    active_deposits: buildOperations(seed, 'deposit', canWithdraw),
    active_withdrawals: buildOperations(seed, 'withdrawal', canWithdraw),
    meta: { demo: true }
  };
}

function validateCaptainRequest(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST method' });
    return null;
  }
  if (!req.is('application/json') || !req.rawBody || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'invalid_request', message: 'Request body must be valid JSON' });
    return null;
  }
  const contact = req.body.contact || {};
  const custom = contact.custom_attributes || {};
  const hasContact = Boolean(contact.rapira_user_id || contact.id || contact.account_id || contact.telegram_id || custom.rapira_user_id || custom.account_id || custom.telegram_id || contact.identifier || contact.email || contact.phone || req.body.rapira_user_id || req.body.account_id || req.body.telegram_id || req.body.identifier || req.body.email || req.body.phone || req.body.contact_id);
  if (!hasContact) {
    res.status(400).json({ error: 'missing_contact', message: 'Contact data is required' });
    return null;
  }
  return req.body;
}

function normalizeOperation(operation) {
  if (!operation) return null;
  return {
    id: operation.id,
    type: operation.type,
    method: operation.method_label,
    amount: operation.amount,
    currency: operation.currency,
    token: operation.token,
    network: operation.network,
    status: operation.status,
    processing_time: operation.processing_time_label,
    txid: operation.txid,
    started_at: operation.started_at || operation.created_at,
    address: operation.address || null,
    deposit_address: operation.deposit_address || null,
    withdrawal_address: operation.withdrawal_address || null,
    hash: operation.hash || operation.txid || null,
    deal_number: operation.deal_number || null,
    counterparty: operation.counterparty || null,
    fee: operation.fee ?? null
  };
}

function operationLine(operation) {
  const network = operation.network ? `, сеть ${operation.network}` : '';
  const txid = operation.txid ? `, TXID ${operation.txid}` : '';
  const p2p = operation.method === 'p2p' ? `, сделка ${operation.deal_number}, контрагент ${operation.counterparty}, комиссия ${operation.fee} ${operation.currency}` : '';
  const crypto = operation.method === 'crypto' ? `, адрес ${operation.address}, начало ${operation.started_at}` : '';
  return `${operation.method_label}: ${operation.amount} ${operation.currency}${network}, статус ${operation.status}, в обработке ${operation.processing_time_label}, ID ${operation.id}${txid}${p2p}${crypto}`;
}

function findOperation(operations, request) {
  if (request.operation_id) return operations.find(operation => operation.id.toLowerCase() === String(request.operation_id).toLowerCase()) || null;
  if (request.txid) return operations.find(operation => operation.txid?.toLowerCase() === String(request.txid).toLowerCase()) || null;
  return null;
}

function filterOperations(profile, request) {
  const type = String(request.operation_type || '').toLowerCase();
  const all = [...profile.active_deposits, ...profile.active_withdrawals];
  const operation = findOperation(all, request);
  if (request.operation_id || request.txid || type === 'operation_status') return { deposits: [], withdrawals: [], operation };
  if (type === 'deposit') return { deposits: profile.active_deposits, withdrawals: [], operation: null };
  if (type === 'withdrawal') return { deposits: [], withdrawals: profile.active_withdrawals, operation: null };
  if (type === 'p2p') return { deposits: profile.active_deposits.filter(op => op.method === 'p2p'), withdrawals: profile.active_withdrawals.filter(op => op.method === 'p2p'), operation: null };
  if (type === 'sbp') return { deposits: profile.active_deposits.filter(op => op.method === 'sbp'), withdrawals: [], operation: null };
  if (type === 'crypto') return { deposits: profile.active_deposits.filter(op => op.method === 'crypto'), withdrawals: profile.active_withdrawals.filter(op => op.method === 'crypto'), operation: null };
  if (type === 'cash') return { deposits: profile.active_deposits.filter(op => op.method === 'office_cash'), withdrawals: profile.active_withdrawals.filter(op => op.method === 'office_cash'), operation: null };
  if (type === 'balance' || type === 'kyc') return { deposits: [], withdrawals: [], operation: null };
  return { deposits: profile.active_deposits, withdrawals: profile.active_withdrawals, operation: null };
}

function operationNotFoundResponse(profile) {
  return {
    customer: `${profile.user.name}, ${profile.user.email}`,
    kyc_status: profile.account.kyc_status,
    withdrawal_enabled: profile.account.withdrawal_enabled,
    trading_enabled: profile.account.trading_enabled,
    balances: [],
    active_deposits: [],
    active_withdrawals: [],
    operation: null,
    public_recommendation: 'Операция по указанным данным не найдена. Попросите клиента проверить ID операции или TXID/hash и при необходимости передайте обращение специалисту.',
    instruction: 'Не придумывай данные операции. Попроси корректный ID операции или TXID/hash.'
  };
}

function summarizeForCaptain(profile, request = {}) {
  const type = String(request.operation_type || '').toLowerCase();
  const { deposits, withdrawals, operation } = filterOperations(profile, request);
  if ((request.operation_id || request.txid || type === 'operation_status') && !operation) return operationNotFoundResponse(profile);
  const includeBalances = !type || type === 'balance' || type === 'kyc';
  return {
    customer: `${profile.user.name}, ${profile.user.email}`,
    kyc_status: profile.account.kyc_status,
    withdrawal_enabled: profile.account.withdrawal_enabled,
    trading_enabled: profile.account.trading_enabled,
    balances: includeBalances ? profile.balances.map(balance => `${balance.currency}: доступно ${balance.available}, в холде ${balance.locked}`) : [],
    active_deposits: deposits.map(operationLine),
    active_withdrawals: withdrawals.map(operationLine),
    operation: normalizeOperation(operation),
    public_recommendation: operation ? 'Сообщите клиенту статус операции и попросите чек, ID операции или TXID/hash, если требуется ручная проверка.' : 'Используйте найденные данные для ответа клиенту. Если данных недостаточно, попросите уточнить ID операции, TXID/hash или способ операции.',
    instruction: 'Используй эти данные для ответа клиенту. Не раскрывай risk_level, last_login_ip и внутренние технические причины ограничений.'
  };
}

app.get('/', (_req, res) => res.redirect('/dashboard.html'));
app.get('/api/user', (req, res) => res.json(buildUser(requestContext(req))));
app.all('/api/captain/user-context', (req, res) => {
  const body = validateCaptainRequest(req, res);
  if (!body) return;
  res.json(summarizeForCaptain(buildUser(requestContext(req)), body));
});
app.post('/api/support-answer', (req, res) => {
  const profile = buildUser(req.body.contact || req.body.user || {});
  res.json({ profile, answer: 'Демо-ответ сформирован на основе данных профиля.' });
});
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'invalid_request', message: 'Request body must be valid JSON' });
  next(error);
});

app.listen(port, () => console.log(`Rapira Chatwoot mock app: http://localhost:${port}/dashboard.html`));
