#!/usr/bin/env node
// 抓幣安現貨 24h 行情，挑出當天異動幣，輸出 JSON 給寫稿用。公開 API，不需要 key。
// 用法：node scripts/hot.mjs [--top 5]

const API = 'https://api.binance.com/api/v3/ticker/24hr';
const MIN_QUOTE_VOL = 20_000_000; // 成交額低於 2000 萬 USDT 的幣不列，避免冷門幣亂跳
const STABLES = new Set(['USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'EUR', 'USD1', 'XUSD', 'BFUSD', 'RLUSD', 'U', 'USDE', 'PYUSD']);

const i = process.argv.indexOf('--top');
const topN = i > 0 ? Number(process.argv[i + 1]) : 5;
if (!Number.isSafeInteger(topN) || topN <= 0) {
  console.error('--top 必須是正整數（例如：--top 5）');
  process.exit(2);
}

try {
  const res = await fetch(API, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    console.error(`行情 API 失敗：HTTP ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  if (!Array.isArray(data) || !data.every((r) =>
    r !== null && typeof r === 'object' && typeof r.symbol === 'string' &&
    ['lastPrice', 'priceChangePercent', 'quoteVolume'].every((key) =>
      (typeof r[key] === 'string' && r[key].trim() !== '' || typeof r[key] === 'number') &&
      Number.isFinite(Number(r[key]))))) {
    throw new Error('行情 API 回應格式錯誤：預期行情陣列及有效的價格、漲跌幅、成交額');
  }
  const rows = data
    .filter((r) => r.symbol.endsWith('USDT'))
    .map((r) => ({
      coin: r.symbol.slice(0, -4),
      price: Number(r.lastPrice),
      changePct: Number(r.priceChangePercent),
      quoteVolM: Math.round(Number(r.quoteVolume) / 1e6),
    }))
    .filter((r) => !STABLES.has(r.coin) && r.quoteVolM * 1e6 >= MIN_QUOTE_VOL);

  const pick = (coin) => rows.find((r) => r.coin === coin) ?? null;
  const byChange = [...rows].sort((a, b) => b.changePct - a.changePct);

  console.log(JSON.stringify({
    at: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
    majors: { BTC: pick('BTC'), ETH: pick('ETH'), BNB: pick('BNB') },
    gainers: byChange.slice(0, topN),
    losers: byChange.slice(-topN).reverse(),
    volume: [...rows].sort((a, b) => b.quoteVolM - a.quoteVolM).slice(0, topN),
  }, null, 2));
} catch (error) {
  console.error(`行情 API 失敗：${error.message}`);
  process.exitCode = 1;
}
