import crypto from 'node:crypto';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function logoSignature(key) {
  return crypto.createHmac('sha256', required('LOGO_VIEW_SECRET')).update(key).digest('hex');
}

export function isValidLogoSignature(key, signature) {
  if (!/^[a-f0-9]{64}$/.test(String(signature || ''))) return false;
  const expected = Buffer.from(logoSignature(key), 'hex');
  const actual = Buffer.from(signature, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function appOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
  return `${proto}://${host}`;
}

export function logoViewUrl(req, key) {
  const query = new URLSearchParams({ key, sig: logoSignature(key) });
  return `${appOrigin(req)}/api/logo?${query}`;
}

export async function logoGateway(action, payload = {}) {
  const response = await fetch(required('SUPABASE_LOGO_GATEWAY_URL'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': required('SUPABASE_LOGO_GATEWAY_SECRET'),
    },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'Phản hồi kho logo không hợp lệ' }));
  if (!response.ok || data.ok !== true) throw new Error(data.error || `Logo gateway ${response.status}`);
  return data;
}
