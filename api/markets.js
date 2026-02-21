// api/markets.js — Vercel serverless function (CommonJS)

const MIN_VOL_POLY   = 50000;
const MIN_VOL_KALSHI = 5000;
const MIN_VOL_MANI   = 1000;
const MIN_META_FORE  = 50;

async function safeFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const results = {
    polymarket: [], kalshi: [], manifold: [], metaculus: [],
    errors: {}, fetchedAt: new Date().toISOString()
  };

  await Promise.allSettled([

    // Polymarket
    safeFetch('https://gamma-api.polymarket.com/markets?limit=50&active=true&order=volume&ascending=false')
      .then(data => {
        const markets = Array.isArray(data) ? data : (data.markets || []);
        results.polymarket = markets
          .map(m => {
            let yesPrice = 0;
            try {
              const prices = typeof m.outcomePrices === 'string'
                ? JSON.parse(m.outcomePrices)
                : (m.outcomePrices || []);
              yesPrice = parseFloat(prices[0]) || 0;
            } catch(_) {
              yesPrice = parseFloat(m.bestBid || m.lastTradePrice || 0);
            }
            const volume    = parseFloat(m.volume || 0);
            const volume24h = parseFloat(m.volume24hr || 0);
            const lastPrice = parseFloat(m.lastTradePrice || yesPrice);
            return {
              id: m.id || m.conditionId,
              source: 'Polymarket',
              name: m.question || m.title || 'Unknown',
              yesPrice,
              volume,
              volume24h,
              change: ((yesPrice - lastPrice) * 100).toFixed(1),
              category: m.category || '',
              url: m.url || 'https://polymarket.com',
            };
          })
          .filter(m => m.volume >= MIN_VOL_POLY && m.yesPrice > 0.02 && m.yesPrice < 0.98)
          .sort((a, b) => b.volume24h - a.volume24h)
          .slice(0, 20);
      })
      .catch(e => { results.errors.polymarket = e.message; }),

    // Kalshi
    safeFetch('https://api.elections.kalshi.com/trade-api/v2/markets?limit=50&status=open')
      .then(data => {
        results.kalshi = (data.markets || [])
          .map(m => {
            const bid  = m.yes_bid   || 0;
            const ask  = m.yes_ask   || 0;
            const last = m.last_price || 0;
            let yesPrice;
            if (bid > 0 && ask > 0)  yesPrice = ((bid + ask) / 2) / 100;
            else if (last > 0)        yesPrice = last / 100;
            else if (bid > 0)         yesPrice = bid  / 100;
            else if (ask > 0)         yesPrice = ask  / 100;
            else                      return null;
            const prevBid = m.previous_yes_bid || 0;
            return {
              id: m.ticker,
              source: 'Kalshi',
              name: m.title || 'Unknown',
              yesPrice,
              volume:    m.volume    || 0,
              volume24h: m.volume_24h || 0,
              change: (bid > 0 && prevBid > 0) ? (bid - prevBid).toFixed(1) : '0.0',
              category: m.category || '',
              url: `https://kalshi.com/markets/${m.ticker}`,
            };
          })
          .filter(m => m && m.volume >= MIN_VOL_KALSHI && m.yesPrice > 0.02 && m.yesPrice < 0.98)
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 20);
      })
      .catch(e => { results.errors.kalshi = e.message; }),

    // Manifold
    safeFetch('https://api.manifold.markets/v0/markets?limit=50&sort=liquidity&filter=open')
      .then(data => {
        results.manifold = (Array.isArray(data) ? data : [])
          .filter(m => m.outcomeType === 'BINARY' && m.probability && (m.volume || 0) >= MIN_VOL_MANI && m.probability > 0.03 && m.probability < 0.97)
          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
          .slice(0, 15)
          .map(m => ({
            id: m.id,
            source: 'Manifold',
            name: m.question,
            yesPrice: m.probability,
            volume:    m.volume || 0,
            volume24h: 0,
            change: '0.0',
            category: m.groupSlugs?.[0] || '',
            url: m.url,
          }));
      })
      .catch(e => { results.errors.manifold = e.message; }),

    // Metaculus
    safeFetch('https://www.metaculus.com/api2/questions/?order_by=-number_of_forecasters&type=forecast&status=open&limit=30')
      .then(data => {
        results.metaculus = (data.results || [])
          .filter(q => q.community_prediction?.full?.q2 != null && (q.number_of_forecasters || 0) >= MIN_META_FORE)
          .sort((a, b) => (b.number_of_forecasters || 0) - (a.number_of_forecasters || 0))
          .slice(0, 12)
          .map(q => ({
            id: String(q.id),
            source: 'Metaculus',
            name: q.title,
            yesPrice: q.community_prediction.full.q2,
            volume:    q.number_of_forecasters || 0,
            volume24h: 0,
            change: '0.0',
            category: q.categories?.[0]?.name || '',
            url: `https://www.metaculus.com/questions/${q.id}`,
          }));
      })
      .catch(e => { results.errors.metaculus = e.message; }),

  ]);

  return res.status(200).json(results);
};
