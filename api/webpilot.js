// Vercel Serverless Function - WebPilot 프록시
// 파일 위치: api/webpilot.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, key } = req.query;
  if (!url || !key) return res.status(400).json({ error: '파라미터 오류' });

  try {
    const r = await fetch('https://api.webpilot.ai/api/visit-web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'WebPilot-Friend-UID': key,
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        link: url,
        ur: '블로그 본문 내용을 추출해주세요.',
        user_has_request: false
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!r.ok) return res.status(200).json({ content: null });
    const data = await r.json();
    const content = data.content || data.text || data.result || null;
    return res.status(200).json({ content: content ? content.slice(0, 3000) : null });
  } catch (e) {
    return res.status(200).json({ content: null, error: e.message });
  }
}
