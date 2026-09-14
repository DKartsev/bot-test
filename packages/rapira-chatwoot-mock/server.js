import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.redirect('/dashboard.html');
});

const names = ['Алексей', 'Мария', 'Даниил', 'Екатерина', 'Илья', 'София'];
const surnames = ['Иванов', 'Петрова', 'Смирнов', 'Кузнецова', 'Орлов', 'Волкова'];
const kycStatuses = ['verified', 'pending_review', 'rejected', 'not_started'];
const riskLevels = ['low', 'medium', 'high'];
const fiatCurrencies = ['RUB', 'USDT', 'BTC', 'ETH'];
const cryptoNetworks = ['TRC20', 'ERC20', 'BEP20', 'TON', 'BTC'];
const depositMethods = ['sbp', 'p2p', 'crypto', 'office_cash'];
const withdrawalMethods = ['p2p', 'crypto', 'office_cash'];
const supportFlags = [
  'withdrawal_delay',
  'kyc_required',
  'fiat_deposit_pending',
  'security_hold',
  'no_active_incident'
];
const operationStatuses = ['processing', 'pending_confirmation', 'completed', 'failed', 'blocked', 'cancelled', 'manual_review'];
const operationTypes = ['balance', 'deposit', 'withdrawal', 'kyc', 'p2p', 'sbp', 'crypto', 'cash', 'operation_status'];
const operationLookupTypes = ['operation_status', 'crypto', 'deposit', 'withdrawal', 'p2p', 'sbp', 'cash'];
const counterparties = ['AlexPay', 'MarketMaker77', 'RubDesk', 'FastTrade', 'Rapira OTC'];

function hash(input) {
  return [...String(input || 'anonymous')].reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function pick(list, seed, offset = 0) {
  return list[((seed >>> 0) + offset) % list.length];
}

function money(seed, min, max) {
  const safeSeed = seed >>> 0;
  const value = min + (safeSeed % (max - min + 1));
  return Number(value.toFixed(2));
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
  if (!rest) return `${hours} ч.`;
  return `${hours} ч. ${rest} мин.`;
}

function methodLabel(method) {
  const labels = {
    sbp: 'СБП',
    p2p: 'P2P сделка',
    crypto: 'Криптовалюта',
    office_cash: 'Наличные в офисе'
  };

  return labels[method] || method;
}

function hex(seed, prefix = '', length = 12) {
  const first = (seed >>> 0).toString(16).padStart(8, '0');
  const second = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0');
  return `${prefix}${first}${second}`.slice(0, prefix.length + length);
}

function operationStatus(seed, index, fallback) {
  if (fallback) return fallback;
  return pick(operationStatuses, seed, index);
}

function cryptoAmount(seed, token) {
  const ranges = {
    BTC: [0.001, 0.25],
    ETH: [0.01, 8],
    TON: [10, 12000],
    USDT: [10, 50000]
  };
  const [min, max] = ranges[token] || [1, 1000];
  const scaled = min + ((seed >>> 0) % 100000) / 100000 * (max - min);
  return Number(scaled.toFixed(token === 'BTC' ? 6 : 2));
}

function enrichOperation(operation, seed, index) {
  if (operation.method === 'p2p') {
    operation.deal_number = `P2P-${100000 + ((seed + index * 137) >>> 0) % 900000}`;
    operation.counterparty = pick(counterparties, seed, index);
    operation.fee = money(seed >>> (index % 8), 0, 1500);
  }

  if (operation.method === 'crypto') {
    const chain = operation.network?.toLowerCase() || 'chain';
    operation.started_at = operation.created_at;
    operation.address = `${chain}_${hex(seed + index * 421, '', 28)}`;
    operation.deposit_address = operation.direction === 'deposit' ? operation.address : null;
    operation.withdrawal_address = operation.direction === 'withdrawal' ? operation.address : null;
    operation.hash = operation.txid;
  }

  return operation;
}

function buildActiveDeposits(seed, flag) {
  const count = flag === 'fiat_deposit_pending' ? 3 : 1 + (seed % 3);
  return Array.from({ length: count }, (_, index) => {
    const method = pick(depositMethods, seed, index);
    const isCrypto = method === 'crypto';
    const shiftedSeed = seed >>> (index % 16);
    const minutes = processingMinutes(shiftedSeed, 8, method === 'crypto' ? 180 : 90);

    const token = isCrypto ? pick(['USDT', 'BTC', 'ETH', 'TON'], seed, index) : 'RUB';
    const network = isCrypto ? pick(cryptoNetworks, seed, index) : null;

    return enrichOperation({
      id: `dep_${(seed + index * 97).toString(16)}`,
      txid: isCrypto ? `tx_${(seed + index * 197).toString(16)}` : null,
      direction: 'deposit',
      type: 'deposit',
      method,
      method_label: methodLabel(method),
      token: isCrypto ? token : null,
      currency: isCrypto ? token : 'RUB',
      network,
      amount: isCrypto ? cryptoAmount(shiftedSeed, token) : money(shiftedSeed, 1000, 300000),
      status: operationStatus(seed, index, index === 0 ? 'processing' : null),
      created_at: isoMinutesAgo(minutes),
      processing_minutes: minutes,
      processing_time_label: formatDuration(minutes)
    }, seed, index);
  });
}

function buildActiveWithdrawals(seed, canWithdraw, flag) {
  const count = flag === 'withdrawal_delay' || !canWithdraw ? 2 : 1 + ((seed >>> 2) % 3);
  return Array.from({ length: count }, (_, index) => {
    const method = pick(withdrawalMethods, seed, index + 4);
    const isCrypto = method === 'crypto';
    const shiftedSeed = seed >>> ((index + 2) % 16);
    const minutes = processingMinutes(shiftedSeed, 12, isCrypto ? 240 : 120);

    const token = isCrypto ? pick(['USDT', 'BTC', 'ETH', 'TON'], seed, index + 2) : 'RUB';
    const network = isCrypto ? pick(cryptoNetworks, seed, index + 2) : null;
    const status = canWithdraw ? operationStatus(seed, index + 3, 'processing') : operationStatus(seed, index + 3, 'blocked');

    return enrichOperation({
      id: `wd_${(seed + index * 131).toString(16)}`,
      txid: isCrypto && ['completed', 'processing', 'pending_confirmation'].includes(status) ? `tx_${(seed + index * 211).toString(16)}` : null,
      direction: 'withdrawal',
      type: 'withdrawal',
      method,
      method_label: methodLabel(method),
      token: isCrypto ? token : null,
      currency: isCrypto ? token : 'RUB',
      network,
      amount: isCrypto ? cryptoAmount(shiftedSeed, token) : money(shiftedSeed, 1000, 250000),
      status,
      created_at: isoMinutesAgo(minutes),
      processing_minutes: minutes,
      processing_time_label: formatDuration(minutes)
    }, seed, index);
  });
}

function buildUser(query = {}) {
  const identity = query.rapira_user_id || query.account_id || query.telegram_id || query.identifier || query.email || query.user_id || query.contact_id || query.phone || 'guest';
  const seed = hash(identity);
  const kycStatus = pick(kycStatuses, seed, 2);
  const flag = pick(supportFlags, seed, 5);
  const blocked = flag === 'security_hold' || kycStatus === 'rejected';
  const canWithdraw = !blocked && kycStatus === 'verified';
  const activeDeposits = buildActiveDeposits(seed, flag);
  const activeWithdrawals = buildActiveWithdrawals(seed, canWithdraw, flag);

  return {
    user: {
      id: query.account_id || query.rapira_user_id || `rp_${seed.toString(16).slice(0, 8)}`,
      telegram_id: query.telegram_id || null,
      name: `${pick(names, seed)} ${pick(surnames, seed, 1)}`,
      email: query.email || `client-${seed % 10000}@example.com`,
      phone: query.phone || `+7 9${String(seed % 1000000000).padStart(9, '0')}`,
      registered_at: new Date(Date.now() - (seed % 900) * 86400000).toISOString(),
      language: 'ru'
    },
    account: {
      kyc_status: kycStatus,
      risk_level: pick(riskLevels, seed, 3),
      two_factor_enabled: seed % 3 !== 0,
      withdrawal_enabled: canWithdraw,
      trading_enabled: !blocked,
      last_login_ip: `185.${seed % 255}.${(seed >> 8) % 255}.${(seed >> 16) % 255}`
    },
    balances: fiatCurrencies.map((currency, index) => ({
      currency,
      available: money(seed >> index, index === 1 ? 20 : 0, index === 0 ? 400000 : 7),
      locked: money(seed >> (index + 3), 0, index === 0 ? 50000 : 2)
    })),
    active_deposits: activeDeposits,
    active_withdrawals: activeWithdrawals,
    latest_operations: [
      ...activeWithdrawals,
      ...activeDeposits,
      {
        type: 'withdrawal',
        asset: 'USDT',
        amount: money(seed, 15, 1200),
        status: canWithdraw ? 'processing' : 'blocked',
        created_at: new Date(Date.now() - (seed % 12) * 3600000).toISOString()
      },
      {
        type: 'deposit',
        asset: 'RUB',
        amount: money(seed, 1000, 150000),
        status: flag === 'fiat_deposit_pending' ? 'pending_confirmation' : 'completed',
        created_at: new Date(Date.now() - (seed % 72) * 3600000).toISOString()
      }
    ],
    meta: {
      demo: true
    }
  };
}

function contextFromRequest(req) {
  const bodyContact = req.body?.contact || {};
  const customAttributes = bodyContact.custom_attributes || {};

  return {
    rapira_user_id: bodyContact.rapira_user_id || customAttributes.rapira_user_id || req.body?.rapira_user_id || '',
    account_id: bodyContact.id || bodyContact.account_id || customAttributes.account_id || req.body?.account_id || req.query.account_id || req.query.contact_id || '',
    telegram_id: bodyContact.telegram_id || customAttributes.telegram_id || req.body?.telegram_id || req.query.telegram_id || '',
    identifier: bodyContact.identifier || req.body?.identifier || '',
    email: bodyContact.email || req.body?.email || req.query.email || req.get('X-Chatwoot-Contact-Email') || '',
    phone: bodyContact.phone || req.body?.phone || req.query.phone || req.get('X-Chatwoot-Contact-Phone') || '',
    contact_id: bodyContact.id || req.body?.contact_id || req.query.contact_id || req.get('X-Chatwoot-Contact-Id') || '',
    conversation_id: req.get('X-Chatwoot-Conversation-Id') || '',
    chatwoot_account_id: req.get('X-Chatwoot-Account-Id') || '',
    inbox_verified: req.get('X-Chatwoot-Contact-Inbox-Verified') || ''
  };
}

function normalizeOperation(operation) {
  if (!operation) return null;

  return {
    id: operation.id,
    type: operation.type || operation.direction,
    method: operation.method_label,
    amount: Math.max(0, Number(operation.amount) || 0),
    currency: operation.currency || operation.token || 'RUB',
    token: operation.token,
    network: operation.network,
    status: operation.status,
    processing_time: operation.processing_time_label,
    txid: operation.txid || null,
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
  const crypto = operation.method === 'crypto'
    ? `, адрес ${operation.address}, начало ${operation.started_at}`
    : '';
  return `${operation.method_label}: ${operation.amount} ${operation.currency}${network}, статус ${operation.status}, в обработке ${operation.processing_time_label}, ID ${operation.id}${txid}${p2p}${crypto}`;
}

function findOperation(operations, { operation_id: operationId, txid }) {
  if (operationId) {
    return operations.find(operation => operation.id.toLowerCase() === String(operationId).toLowerCase()) || null;
  }

  if (txid) {
    return operations.find(operation => operation.txid?.toLowerCase() === String(txid).toLowerCase()) || null;
  }

  return null;
}

function filterOperations(profile, { operation_type: operationType, operation_id: operationId, txid }) {
  const allOperations = [...profile.active_deposits, ...profile.active_withdrawals];
  const type = String(operationType || '').toLowerCase();
  const shouldFindOperation = operationLookupTypes.includes(type) && (operationId || txid || type === 'operation_status');
  const operation = shouldFindOperation ? findOperation(allOperations, { operation_id: operationId, txid }) : null;

  if (shouldFindOperation) {
    return { deposits: [], withdrawals: [], operation };
  }

  if (type === 'deposit') return { deposits: profile.active_deposits, withdrawals: [], operation: null };
  if (type === 'withdrawal') return { deposits: [], withdrawals: profile.active_withdrawals, operation: null };
  if (type === 'p2p') {
    return {
      deposits: profile.active_deposits.filter(operation => operation.method === 'p2p'),
      withdrawals: profile.active_withdrawals.filter(operation => operation.method === 'p2p'),
      operation: null
    };
  }
  if (type === 'sbp') {
    return {
      deposits: profile.active_deposits.filter(operation => operation.method === 'sbp'),
      withdrawals: [],
      operation: null
    };
  }
  if (type === 'crypto') {
    return {
      deposits: profile.active_deposits.filter(operation => operation.method === 'crypto'),
      withdrawals: profile.active_withdrawals.filter(operation => operation.method === 'crypto'),
      operation: null
    };
  }
  if (type === 'cash') {
    return {
      deposits: profile.active_deposits.filter(operation => operation.method === 'office_cash'),
      withdrawals: profile.active_withdrawals.filter(operation => operation.method === 'office_cash'),
      operation: null
    };
  }

  return { deposits: profile.active_deposits, withdrawals: profile.active_withdrawals, operation: null };
}

function recommendationFor({ operationType, operation }) {
  if (operation) return 'Сообщите клиенту статус операции и попросите чек, ID операции или TXID/hash, если требуется ручная проверка.';
  if (operationType === 'balance') return 'Сообщите клиенту доступные балансы и ограничения по торговле/выводу.';
  if (operationType === 'kyc') return 'Сообщите клиенту статус верификации и доступные операции без раскрытия внутренних причин ограничений.';
  return 'Используйте найденные данные для ответа клиенту. Если данных недостаточно, попросите уточнить ID операции, TXID/hash или способ операции.';
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
  const operationType = String(request.operation_type || '').toLowerCase();
  const { deposits, withdrawals, operation } = filterOperations(profile, request);

  if (operationLookupTypes.includes(operationType) && (request.operation_id || request.txid || operationType === 'operation_status') && !operation) {
    return operationNotFoundResponse(profile);
  }

  const includeBalances = !operationType || operationType === 'balance' || operationType === 'kyc';
  const includeDeposits = !operationType || !['balance', 'kyc'].includes(operationType);
  const includeWithdrawals = !operationType || !['balance', 'kyc'].includes(operationType);

  const depositLines = includeDeposits ? deposits.map(operationLine) : [];
  const withdrawalLines = includeWithdrawals ? withdrawals.map(operationLine) : [];
  const balances = includeBalances
    ? profile.balances.map(balance => `${balance.currency}: доступно ${Math.max(0, balance.available)}, в холде ${Math.max(0, balance.locked)}`)
    : [];

  return {
    customer: `${profile.user.name}, ${profile.user.email}`,
    kyc_status: profile.account.kyc_status,
    withdrawal_enabled: profile.account.withdrawal_enabled,
    trading_enabled: profile.account.trading_enabled,
    balances,
    active_deposits: depositLines,
    active_withdrawals: withdrawalLines,
    operation: normalizeOperation(operation),
    public_recommendation: recommendationFor({ operationType, operation }),
    instruction: 'Используй эти данные для ответа клиенту. Не раскрывай risk_level, last_login_ip и внутренние технические причины ограничений.'
  };
}

function legacySummarizeForCaptain(profile) {
  const deposits = profile.active_deposits.map(operation => {
    const network = operation.network ? `, сеть ${operation.network}` : '';
    return `${operation.method_label}: ${operation.amount} ${operation.token}${network}, статус ${operation.status}, в обработке ${operation.processing_time_label}, ID ${operation.id}`;
  });

  const withdrawals = profile.active_withdrawals.map(operation => {
    const network = operation.network ? `, сеть ${operation.network}` : '';
    return `${operation.method_label}: ${operation.amount} ${operation.token}${network}, статус ${operation.status}, в обработке ${operation.processing_time_label}, ID ${operation.id}`;
  });

  return {
    customer: `${profile.user.name}, ${profile.user.email}`,
    kyc_status: profile.account.kyc_status,
    withdrawal_enabled: profile.account.withdrawal_enabled,
    trading_enabled: profile.account.trading_enabled,
    balances: profile.balances.map(balance => `${balance.currency}: доступно ${balance.available}, в холде ${balance.locked}`),
    active_deposits: deposits,
    active_withdrawals: withdrawals,
    instruction: 'Используй эти данные для ответа клиенту. Не раскрывай risk_level, last_login_ip и внутренние технические причины ограничений.'
  };
}

function validateCaptainRequest(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'method_not_allowed',
      message: 'Use POST method'
    });
    return null;
  }

  if (!req.is('application/json') || !req.rawBody || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be valid JSON'
    });
    return null;
  }

  const contact = req.body.contact || {};
  const customAttributes = contact.custom_attributes || {};
  const operationType = String(req.body.operation_type || '').toLowerCase();
  const hasContact = Boolean(
    contact.rapira_user_id ||
      contact.id ||
      contact.account_id ||
      contact.telegram_id ||
      customAttributes.rapira_user_id ||
      customAttributes.account_id ||
      customAttributes.telegram_id ||
      req.body.rapira_user_id ||
      req.body.account_id ||
      req.body.telegram_id ||
      req.body.contact_id
  );

  if (!hasContact) {
    res.status(400).json({
      error: 'missing_contact',
      message: 'Contact data is required'
    });
    return null;
  }

  if (operationType && !operationTypes.includes(operationType)) {
    res.status(400).json({
      error: 'invalid_operation_type',
      message: `Unsupported operation_type: ${operationType}`
    });
    return null;
  }

  return req.body;
}

function recommendedAction({ flag, kycStatus, canWithdraw }) {
  if (kycStatus === 'pending_review') return 'Сообщить, что проверка документов еще идет. Не обещать точный срок без данных SLA.';
  if (kycStatus === 'rejected') return 'Попросить клиента повторно пройти верификацию и проверить качество документов.';
  if (flag === 'security_hold') return 'Объяснить, что операция временно удержана системой безопасности. Передать кейс специалисту.';
  if (flag === 'fiat_deposit_pending') return 'Проверить зачисление RUB и попросить клиента дождаться подтверждения платежного провайдера.';
  if (flag === 'withdrawal_delay') return 'Сообщить, что вывод находится в обработке, и проверить TXID/статус сети.';
  if (canWithdraw) return 'Клиент верифицирован, ограничения не видны. Дать стандартный ответ по вопросу.';
  return 'Уточнить детали обращения и не раскрывать внутренние риск-флаги клиенту.';
}

function makeSupportAnswer(question, profile) {
  const q = String(question || '').toLowerCase();
  const kyc = profile.account.kyc_status;
  const withdrawal = profile.active_withdrawals[0];
  const deposit = profile.active_deposits[0];

  if (q.includes('вывод') || q.includes('withdraw')) {
    if (withdrawal) {
      const network = withdrawal.network ? `, сеть ${withdrawal.network}` : '';
      if (withdrawal.status === 'blocked') {
        return `Вижу активный вывод через ${withdrawal.method_label}: ${withdrawal.amount} ${withdrawal.token}${network}. Сейчас операция ограничена и находится в обработке ${withdrawal.processing_time_label}. Пожалуйста, завершите необходимые проверки в аккаунте; если они уже выполнены, я передам обращение специалисту.`;
      }

      return `Вижу активный вывод через ${withdrawal.method_label}: ${withdrawal.amount} ${withdrawal.token}${network}. Операция обрабатывается уже ${withdrawal.processing_time_label}. Если статус не изменится, мы проверим ее вручную по ID операции ${withdrawal.id}.`;
    }

    if (!profile.account.withdrawal_enabled) {
      return `По вашему аккаунту сейчас недоступен вывод средств. Чаще всего это связано со статусом верификации или дополнительной проверкой безопасности. Пожалуйста, проверьте раздел верификации; если документы уже отправлены, я передам обращение специалисту для проверки.`;
    }

    return 'Активных выводов по аккаунту сейчас не вижу. Уточните, пожалуйста, способ вывода, сумму, токен и сеть, если речь о криптовалюте.';
  }

  if (q.includes('вериф') || q.includes('kyc')) {
    if (kyc === 'verified') return 'Ваш аккаунт уже верифицирован. Доступ к торговле и стандартным операциям открыт.';
    if (kyc === 'pending_review') return 'Ваши документы находятся на проверке. Дождитесь завершения модерации; мы уведомим вас, когда статус обновится.';
    if (kyc === 'rejected') return 'Верификация не прошла. Пожалуйста, загрузите документы повторно: фото должно быть четким, без бликов и с видимыми данными.';
    return 'Для доступа ко всем функциям биржи нужно пройти верификацию в личном кабинете.';
  }

  if (q.includes('пополн') || q.includes('депозит') || q.includes('deposit')) {
    if (deposit) {
      const network = deposit.network ? `, сеть ${deposit.network}` : '';
      return `Вижу активное пополнение через ${deposit.method_label}: ${deposit.amount} ${deposit.token}${network}. Оно обрабатывается уже ${deposit.processing_time_label}, текущий статус: "${deposit.status}". Если деньги списаны, но баланс не обновится, пришлите чек или ID операции ${deposit.id}.`;
    }

    return 'Активных пополнений по аккаунту сейчас не вижу. Уточните, пожалуйста, способ пополнения: СБП, P2P сделка, криптовалюта или наличные в офисе.';
  }

  return `Я проверил данные аккаунта: статус верификации "${kyc}", торговля ${profile.account.trading_enabled ? 'доступна' : 'ограничена'}. ${recommendedAction({
    flag: pick(supportFlags, hash(profile.user.email), 5),
    kycStatus: kyc,
    canWithdraw: profile.account.withdrawal_enabled
  })}`;
}

app.get('/api/user', (req, res) => {
  res.json(buildUser(contextFromRequest(req)));
});

app.all('/api/captain/user-context', (req, res) => {
  const body = validateCaptainRequest(req, res);
  if (!body) return;

  const profile = buildUser(contextFromRequest(req));
  res.json(summarizeForCaptain(profile, body));
});

app.post('/api/support-answer', (req, res) => {
  const profile = buildUser(req.body.contact || req.body.user || {});
  res.json({
    profile,
    answer: makeSupportAnswer(req.body.question, profile)
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body must be valid JSON'
    });
    return;
  }

  next(error);
});

app.listen(port, () => {
  console.log(`Rapira Chatwoot mock app: http://localhost:${port}/dashboard.html`);
});
