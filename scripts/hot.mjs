#!/usr/bin/env node
// 抓幣安現貨 24h 行情，挑出當天異動幣，輸出 JSON 給寫稿用。公開 API，不需要 key。
// 用法：node scripts/hot.mjs [--top 5]

const API = 'https://api.binance.com/api/v3/ticker/24hr';
const MIN_QUOTE_VOL = 20_000_000; // 成交額低於 2000 萬 USDT 的幣不列，避免冷門幣亂跳
const STABLES = new Set(['USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'EUR', 'USD1', 'XUSD', 'BFUSD', 'RLUSD', 'U', 'USDE', 'PYUSD']);

const i = process.argv.indexOf('--top');
const topN = i > 0 ? Number(process.argv[i + 1]) || 5 : 5;

const res = await fetch(API);
if (!res.ok) {
  console.error(`行情 API 失敗：HTTP ${res.status}`);
  process.exit(1);
}
const rows = (await res.json())
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
