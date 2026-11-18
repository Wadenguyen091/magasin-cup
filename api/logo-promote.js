import { logoGateway } from './_supabase.js';

function fail(res, status, error) {
  res.status(status).json({ ok: false, error });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return fail(res, 405, 'Chỉ hỗ trợ POST');
  const files = req.body?.files;
  if (!Array.isArray(files) || files.length < 1 || files.length > 4) return fail(res, 400, 'Danh sách logo không hợp lệ');
  if (files.some(file => !/^pending\/MC\d{4}-[A-Z0-9]{4}\//.test(file.pendingKey || '') || !/^active\/MC\d{4}-[A-Z0-9]{4}\//.test(file.key || ''))) {
    return fail(res, 400, 'Đường dẫn logo không hợp lệ');
  }
  try {
    await logoGateway('promote', { files });
    return res.status(200).json({ ok: true });
  } catch {
    return fail(res, 502, 'Chưa hoàn tất lưu logo');
  }
}
