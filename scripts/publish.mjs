#!/usr/bin/env node
// 把一份草稿發到幣安廣場：先過 lint、查每日上限，再呼叫官方 square-post 的 post-text.mjs。
// 用法：node scripts/publish.mjs drafts/xxx.md
// 只在使用者對「這一份」草稿點頭後才跑。發出去收不回來。

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lint, body } from './lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OFFICIAL = join(ROOT, 'vendor/binance-skills-hub/skills/binance/square-post/scripts/post-text.mjs');
const KV = join(homedir(), '.config/binance-square/openapi-key');
const DAILY_CAP = Number(process.env.SQUARE_DAILY_CAP) || 3; // 自訂上限，官方是 100；洗版容易被降權

const file = process.argv[2];
if (!file) {
  console.error('用法：node scripts/publish.mjs <草稿.md>');
  process.exit(2);
}
const md = readFileSync(file, 'utf8');
if (/^status:\s*posted/m.test(md)) {
  console.error('這份已經發過了');
  process.exit(1);
}

const text = body(md);
const errors = lint(text);
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Taipei' });
const draftsDir = join(ROOT, 'drafts');
const postedToday = readdirSync(draftsDir).filter((f) =>
  new RegExp(`^posted_at:\\s*${today}`, 'm').test(readFileSync(join(draftsDir, f), 'utf8'))).length;
if (postedToday >= DAILY_CAP) {
  console.error(`今天已發 ${postedToday} 篇，達上限 ${DAILY_CAP}`);
  process.exit(1);
}

if (!existsSync(OFFICIAL)) {
  console.error('缺官方發文 skill，先照 README「安裝」段下載到 vendor/');
  process.exit(1);
}

// key 只放在子程序環境變數，不進參數、不印出
const env = { ...process.env };
if (!env.BINANCE_SQUARE_OPENAPI_KEY && existsSync(KV)) env.BINANCE_SQUARE_OPENAPI_KEY = readFileSync(KV, 'utf8').trim();

const r = spawnSync('node', [OFFICIAL, '--text', text], { env, encoding: 'utf8' });
process.stdout.write(r.stdout);
process.stderr.write(r.stderr);
if (r.status !== 0) process.exit(r.status ?? 1);

const link = r.stdout.match(/^Link:\s*(.+)$/m)?.[1] ?? 'unavailable';
const now = new Date().toLocaleString('sv', { timeZone: 'Asia/Taipei' });
writeFileSync(file, md.replace(/^status:\s*\w+/m, `status: posted\nposted_at: ${now}\nlink: ${link}`));
