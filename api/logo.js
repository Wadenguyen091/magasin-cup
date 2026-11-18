import { isValidLogoSignature, logoGateway } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const key = String(req.query?.key || '');
  const sig = String(req.query?.sig || '');
  if (!/^active\/MC\d{4}-[A-Z0-9]{4}\//.test(key) || !isValidLogoSignature(key, sig)) return res.status(403).send('Forbidden');
  try {
    const data = await logoGateway('signed-view', { key });
    return res.redirect(302, data.url);
  } catch {
    return res.status(404).send('Logo not found');
  }
}
