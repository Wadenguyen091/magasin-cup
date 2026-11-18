import { logoGateway, logoViewUrl } from './_supabase.js';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fail(res, status, error) {
  res.status(status).json({ ok: false, error });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return fail(res, 405, 'Chỉ hỗ trợ POST');

  const { orderCode, name, type, size } = req.body || {};
  if (!/^MC\d{4}-[A-Z0-9]{4}$/.test(String(orderCode || ''))) return fail(res, 400, 'Mã đơn không hợp lệ');
  if (!name || String(name).length > 160) return fail(res, 400, 'Tên file không hợp lệ');
  if (!ALLOWED_LOGO_TYPES.has(String(type || ''))) return fail(res, 400, 'Chỉ nhận PNG, JPG hoặc WebP');
  if (!Number.isInteger(size) || size < 1 || size > MAX_LOGO_BYTES) return fail(res, 400, 'Mỗi file tối đa 5 MB');

  try {
    const data = await logoGateway('sign-upload', { orderCode, name, type, size });
    return res.status(200).json({
      ok: true,
      pendingKey: data.pendingKey,
      key: data.key,
      uploadUrl: data.uploadUrl,
      viewUrl: logoViewUrl(req, data.key),
    });
  } catch {
    return fail(res, 503, 'Kho logo chưa sẵn sàng');
  }
}
