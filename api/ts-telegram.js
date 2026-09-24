// Trade Saathi Telegram relay: lets the on-device app call the Bot API (browsers can't read its responses directly).
// Only three read/send methods are allowed; the bot token comes from the user's own device and is never stored here.
const ALLOWED = new Set(['getMe', 'getUpdates', 'sendMessage']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { method, params } = req.body ?? {};
  const { token, ...rest } = params ?? {};
  if (!ALLOWED.has(method)) return res.status(400).json({ error: 'method not allowed' });
  if (typeof token !== 'string' || !/^\d{6,12}:[\w-]{30,}$/.test(token)) return res.status(400).json({ error: 'Token sahi format mein nahi hai' });
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(method === 'sendMessage' ? { ...rest, disable_web_page_preview: true } : rest),
    });
    const d = await r.json();
    res.setHeader('cache-control', 'no-store');
    res.status(r.ok ? 200 : 400).json(r.ok ? d : { error: d.description ?? 'Telegram error' });
  } catch {
    res.status(502).json({ error: 'Telegram se baat nahi ho paayi' });
  }
}
