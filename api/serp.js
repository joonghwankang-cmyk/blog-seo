// Vercel Serverless Function - SerpAPI 프록시
// 파일 위치: api/serp.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, num = 10, key } = req.query;
  if (!q || !key) return res.status(400).json({ error: '파라미터 오류' });

  try {
    const url = `https://serpapi.com/search.json?engine=naver&query=${encodeURIComponent(q)}&num=${num}&api_key=${key}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('SerpAPI 오류');
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
