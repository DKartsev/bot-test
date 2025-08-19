// This file contains the core detection logic for the DLP engine.

interface PolicyRule {
  regex: string;
  _regex?: RegExp;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  block_in?: boolean;
  block_out?: boolean;
}

interface Policies {
  version: number;
  allow?: {
    email_domains?: string[];
    test_cards_bin?: string[];
  };
  pii?: Record<string, PolicyRule>;
  secrets?: Record<string, PolicyRule>;
  profanity?: Record<string, PolicyRule>;
}

export interface Detection {
  type: 'pii' | 'secrets' | 'profanity';
  key: string;
  value: string;
  span: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule: PolicyRule;
}

function luhnValid(number: string): boolean {
  const digits = (number || '').replace(/\D+/g, '').split('').reverse();
  if (!digits.length) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digitStr = digits[i];
    if (digitStr === undefined) continue;
    let d = parseInt(digitStr, 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function ibanValid(text: string): boolean {
  const s = (text || '').replace(/\s+/g, '').toUpperCase();
  if (s.length < 5) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const expanded = rearranged
    .split('')
    .map((ch) => (ch >= 'A' && ch <= 'Z' ? ch.charCodeAt(0) - 55 : ch))
    .join('');
  try {
    const remainder = BigInt(expanded) % 97n;
    return remainder === 1n;
  } catch {
    return false; // Handle cases where the number is too large for BigInt, though unlikely for IBAN
  }
}

function compileRegex(p: PolicyRule): RegExp {
  const src = p.regex;
  const flags = src.startsWith('(?i)') ? 'gi' : 'g';
  const body = src.replace('(?i)', '');
  return new RegExp(body, flags);
}

export function detectAll(text: string, policies: Policies): Detection[] {
  const detections: Detection[] = [];
  if (!text) return detections;

  const allowEmails = new Set(policies.allow?.email_domains ?? []);
  const allowBins = policies.allow?.test_cards_bin ?? [];
  const allowTestCards = true; // Assuming this is enabled for now

  const checkType = (type: 'pii' | 'secrets' | 'profanity') => {
    const rules = policies[type] ?? {};
    for (const [key, rule] of Object.entries(rules)) {
      if (!rule.regex) continue;
      const regex = rule._regex ?? (rule._regex = compileRegex(rule));
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text))) {
        const value = match[0];
        if (!value) continue;
        const span: [number, number] = [
          match.index,
          match.index + value.length,
        ];

        // Rule-specific validation
        if (type === 'pii' && key === 'email' && allowEmails.size) {
          const domain = value.split('@')[1]?.toLowerCase();
          if (domain && allowEmails.has(domain)) continue;
        }
        if (type === 'pii' && key === 'credit_card') {
          const digits = value.replace(/\D+/g, '');
          if (!luhnValid(digits)) continue;
          if (allowTestCards && allowBins.some((bin) => digits.startsWith(bin)))
            continue;
        }
        if (type === 'pii' && key === 'iban') {
          if (!ibanValid(value)) continue;
        }

        detections.push({
          type,
          key,
          value,
          span,
          severity: rule.severity ?? 'low',
          rule,
        });
      }
    }
  };

  checkType('pii');
  checkType('secrets');
  checkType('profanity');

  return detections;
}
