// Vercel Serverless Function - 네이버 검색 API 프록시
// 파일 위치: api/naver.js

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 프리플라이트 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, display = 10, sort = 'sim', type = 'search' } = req.query;

  if (!query) {
    return res.status(400).json({ error: '검색어(query)가 필요합니다.' });
  }

  const NAVER_CLIENT_ID = req.headers['x-naver-client-id'];
  const NAVER_CLIENT_SECRET = req.headers['x-naver-client-secret'];

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.status(401).json({ error: '네이버 API 키가 필요합니다.' });
  }

  try {
    if (type === 'content') {
      // 블로그 본문 크롤링
      const targetUrl = query;
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Referer': 'https://blog.naver.com'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        return res.status(200).json({ content: null, error: 'fetch failed' });
      }

      const html = await response.text();

      // 본문 텍스트 추출
      let content = '';
      const selectors = [
        /<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*class="[^"]*post-view[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>/,
        /<article[^>]*>([\s\S]*?)<\/article>/,
        /<main[^>]*>([\s\S]*?)<\/main>/
      ];

      for (const regex of selectors) {
        const match = html.match(regex);
        if (match && match[1]) {
          content = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (content.length > 200) break;
        }
      }

      if (!content || content.length < 100) {
        content = html.replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);
      }

      return res.status(200).json({ content: content.slice(0, 3000) });

    } else {
      // 네이버 블로그 검색
      const searchUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;

      const response = await fetch(searchUrl, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: '네이버 API 오류', detail: errText });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}
