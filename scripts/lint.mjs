#!/usr/bin/env node
// 草稿機械檢查：字數、代幣標籤、繁體、ADHD 版面、去 AI 味句型、喊單用語。
// 用法：node scripts/lint.mjs drafts/xxx.md   有錯 exit 1
// 句型規則取自 genie-humanizer（no-ai-slop、lieflat-less-ai-tone 的結論）。

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const LIMITS = { minChars: 250, maxChars: 500, hookMax: 40, paraMax: 80, minParas: 4, maxEmoji: 2, maxCash: 3, maxTags: 5 };

// [規則名, 正則]；命中就算錯
const SLOP = [
  ['二元對比', /不是[^。！？\n]{1,20}而是|並非[^。！？\n]{1,20}而是|與其說[^。！？\n]{1,20}不如說|看似[^。！？\n]{1,20}實則|你以為[^。！？\n]{1,20}其實/],
  ['填充詞', /值得注意的是|總而言之|綜上所述|簡單來說|說白了|先說結論|換句話說|一句話總結|不得不說|毋庸置疑/],
  ['吹捧／偽洞見', /扮演[^。\n]{0,10}角色|大多數人不知道|很多人不知道|深度解析|全面解析|賦能|在這個[^。\n]{0,12}的時代|讓我們一起/],
  ['句首路標', /(^|[。！？\n])\s*(然而|因此|此外|另外|總之|首先|其次|最後)[，,]/],
  ['含糊歸因', /研究顯示|數據顯示|專家表示|有分析認為/],
];

const SHILL = /穩賺|保證|包賺|必漲|必跌|無風險|梭哈|帶單|跟單群|私訊我|加我|財富自由|百倍幣|千倍幣/;
const NUMBERING = /^\s*(\d+[.、)）]|[一二三四五六七八九十]+、|[-•*·]\s|第[一二三四五]點)/;
const EMOJI = /\p{Extended_Pictographic}/gu;
const HASHTAG = /#[^\s#$]+/g;
const CAUSAL = /因為|所以|代表|導致|意味|說明/;
const CONDITION = /如果|要是|除非|站回|跌破|守住|站穩|失守/;

const countChars = (s) => [...s.replace(/\s/g, '')].length;

export function body(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

export function lint(text, { toTw = opencc } = {}) {
  const errors = [];
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const n = countChars(text);

  if (n < LIMITS.minChars || n > LIMITS.maxChars) errors.push(`字數 ${n}，要 ${LIMITS.minChars}–${LIMITS.maxChars}`);
  const cash = new Set(text.match(/\$[A-Z0-9]{2,10}\b/g) || []);
  if (cash.size === 0) errors.push('沒有 $代幣 標籤（例：$BTC）');
  if (cash.size > LIMITS.maxCash) errors.push(`$代幣 ${cash.size} 種，官方上限 ${LIMITS.maxCash}`);
  const tags = text.match(HASHTAG) || [];
  if (tags.length === 0 || tags.length > LIMITS.maxTags) errors.push(`#話題 ${tags.length} 個，要 1–${LIMITS.maxTags} 個`);

  // 觀點的機械代理：有因果、有條件、結尾有問句。ponytail: 只檢查詞有沒有出現，推理好不好要人看
  const prose = text.replace(HASHTAG, '');
  if (!CAUSAL.test(prose)) errors.push('沒有因果詞（因為／所以／代表／導致／意味），像在列數字');
  if (!CONDITION.test(prose)) errors.push('沒有條件詞（如果／除非／站回／跌破／守住），缺條件式計畫');

  if (paras.length < LIMITS.minParas) errors.push(`只有 ${paras.length} 段，要至少 ${LIMITS.minParas} 段（空行分段）`);
  if (paras[0] && countChars(paras[0]) > LIMITS.hookMax) errors.push(`第一段 ${countChars(paras[0])} 字，鉤子要 ≤${LIMITS.hookMax} 字`);
  const lastProse = paras.filter((p) => p.replace(HASHTAG, '').trim()).at(-1) ?? '';
  if (!/[？?]/.test(lastProse)) errors.push('最後一段沒有問句，缺引導互動');
  paras.forEach((p, i) => {
    if (countChars(p) > LIMITS.paraMax) errors.push(`第 ${i + 1} 段 ${countChars(p)} 字，每段要 ≤${LIMITS.paraMax} 字`);
  });

  text.split('\n').forEach((line, i) => {
    if (NUMBERING.test(line)) errors.push(`第 ${i + 1} 行有序號或項目符號`);
    if (/^[^。！？\n]{1,8}[：:]/.test(line.trim())) errors.push(`第 ${i + 1} 行是冒號揭示句「${line.trim().slice(0, 12)}」`);
  });

  for (const [name, re] of SLOP) {
    const m = text.match(re);
    if (m) errors.push(`AI 味（${name}）：「${m[0].trim()}」`);
  }
  const dashes = (text.match(/——|—/g) || []).length;
  if (dashes > 0) errors.push(`破折號 ${dashes} 個，短文不用`);
  const emoji = (text.match(EMOJI) || []).length;
  if (emoji > LIMITS.maxEmoji) errors.push(`emoji ${emoji} 個，最多 ${LIMITS.maxEmoji}`);

  const shill = text.match(SHILL);
  if (shill) errors.push(`喊單／保證收益用語：「${shill[0]}」`);

  // #話題 要照抄廣場原文（常是簡體），不檢查
  const tw = toTw(prose).replaceAll('臺', '台'); // 台灣通用「台」，opencc 會轉成「臺」
  if (tw !== prose) {
    const diff = [...prose].map((c, i) => (c !== [...tw][i] ? c : '')).join('');
    errors.push(`有簡體字或非台灣用詞：「${diff.slice(0, 20)}」→ 用 opencc s2twp 對照`);
  }
  return errors;
}

function opencc(text) {
  return execFileSync('opencc', ['-c', 's2twp'], { input: text, encoding: 'utf8' }).replace(/\n$/, '') + (text.endsWith('\n') ? '\n' : '');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error('用法：node scripts/lint.mjs <草稿.md>');
    process.exit(2);
  }
  const errors = lint(body(readFileSync(file, 'utf8')));
  if (errors.length) {
    errors.forEach((e) => console.log(`✗ ${e}`));
    process.exit(1);
  }
  console.log(`✓ ${file} 通過`);
}
