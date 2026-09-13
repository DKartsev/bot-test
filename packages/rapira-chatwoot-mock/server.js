import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

function hash(input) {
  return [...String(input || 'anonymous')].reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function money(seed, min, max) {
  const value = min + (seed % (max - min + 1));
  return Number(value.toFixed(2));
}

function processingMinutes(seed, min, max) {
  return min + (seed % (max - min + 1));
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

function buildActiveDeposits(seed, flag) {
  const count = flag === 'fiat_deposit_pending' ? 2 : seed % 3;
  return Array.from({ length: count }, (_, index) => {
    const method = pick(depositMethods, seed, index);
    const isCrypto = method === 'crypto';
    const minutes = processingMinutes(seed >> index, 8, method === 'crypto' ? 180 : 90);

    return {
      id: `dep_${(seed + index * 97).toString(16)}`,
      direction: 'deposit',
      method,
      method_label: methodLabel(method),
      token: isCrypto ? pick(['USDT', 'BTC', 'ETH', 'TON'], seed, index) : 'RUB',
      network: isCrypto ? pick(cryptoNetworks, seed, index) : null,
      amount: isCrypto ? money(seed >> index, 10, 2500) : money(seed >> index, 1000, 300000),
      status: index === 0 ? 'processing' : 'pending_confirmation',
      created_at: isoMinutesAgo(minutes),
      processing_minutes: minutes,
      processing_time_label: formatDuration(minutes)
    };
  });
}

function buildActiveWithdrawals(seed, canWithdraw, flag) {
  const count = flag === 'withdrawal_delay' || !canWithdraw ? 1 : (seed >> 2) % 3;
  return Array.from({ length: count }, (_, index) => {
    const method = pick(withdrawalMethods, seed, index + 4);
    const isCrypto = method === 'crypto';
    const minutes = processingMinutes(seed >> (index + 2), 12, isCrypto ? 240 : 120);

    return {
      id: `wd_${(seed + index * 131).toString(16)}`,
      direction: 'withdrawal',
      method,
      method_label: methodLabel(method),
      token: isCrypto ? pick(['USDT', 'BTC', 'ETH', 'TON'], seed, index + 2) : 'RUB',
      network: isCrypto ? pick(cryptoNetworks, seed, index + 2) : null,
      amount: isCrypto ? money(seed >> index, 15, 1800) : money(seed >> index, 1000, 250000),
      status: canWithdraw ? 'processing' : 'blocked',
      created_at: isoMinutesAgo(minutes),
      processing_minutes: minutes,
      processing_time_label: formatDuration(minutes)
    };
  });
}

function buildUser(query = {}) {
  const identity = query.email || query.user_id || query.contact_id || query.phone || 'guest';
  const seed = hash(identity);
  const kycStatus = pick(kycStatuses, seed, 2);
  const flag = pick(supportFlags, seed, 5);
  const blocked = flag === 'security_hold' || kycStatus === 'rejected';
  const canWithdraw = !blocked && kycStatus === 'verified';
  const activeDeposits = buildActiveDeposits(seed, flag);
  const activeWithdrawals = buildActiveWithdrawals(seed, canWithdraw, flag);

  return {
    user: {
      id: `rp_${seed.toString(16).slice(0, 8)}`,
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
        status: flag === 'fiat_deposit_pending' ? 'pending' : 'completed',
        created_at: new Date(Date.now() - (seed % 72) * 3600000).toISOString()
      }
    ],
    meta: {
      demo: true
    }
  };
}

function contextFromRequest(req) {
  return {
    email: req.query.email || req.get('X-Chatwoot-Contact-Email') || '',
    phone: req.query.phone || req.get('X-Chatwoot-Contact-Phone') || '',
    contact_id: req.query.contact_id || req.get('X-Chatwoot-Contact-Id') || '',
    conversation_id: req.get('X-Chatwoot-Conversation-Id') || '',
    account_id: req.get('X-Chatwoot-Account-Id') || '',
    inbox_verified: req.get('X-Chatwoot-Contact-Inbox-Verified') || ''
  };
}

function summarizeForCaptain(profile) {
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

app.get('/api/captain/user-context', (req, res) => {
  const profile = buildUser(contextFromRequest(req));
  res.json(summarizeForCaptain(profile));
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

app.listen(port, () => {
  console.log(`Rapira Chatwoot mock app: http://localhost:${port}/dashboard.html`);
});
