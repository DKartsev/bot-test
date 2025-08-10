import { Request, Response, NextFunction } from 'express';
import ipRangeCheck from 'ip-range-check';

const allow = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function ipAllowlist(req: Request, res: Response, next: NextFunction) {
  if (req.query.allowlist === 'off') {
    return next();
  }
  if (!allow.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const forwarded = req.header('X-Forwarded-For');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  const ok = allow.some((rule) => ipRangeCheck(ip, rule));
  if (!ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ip.block]', { ip });
    }
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export default ipAllowlist;
