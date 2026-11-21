import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hot = fileURLToPath(new URL('../scripts/hot.mjs', import.meta.url));
const publish = fileURLToPath(new URL('../scripts/publish.mjs', import.meta.url));
function runHot(args, mock) {
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    `globalThis.fetch = ${mock}; process.argv = ['node', ${JSON.stringify(hot)}, ...${JSON.stringify(args)}]; await import(${JSON.stringify(new URL('../scripts/hot.mjs', import.meta.url).href)});`],
  { encoding: 'utf8', timeout: 5000 });
}

test('--top rejects missing, non-integer and non-positive values before fetching', () => {
  for (const args of [['--top'], ...['0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992'].map((v) => ['--top', v])]) {
    const result = runHot(args, '() => { throw new Error("NETWORK MUST NOT RUN"); }');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--top 必須是正整數/);
    assert.doesNotMatch(result.stderr, /NETWORK MUST NOT RUN/);
  }
});

test('valid top and default support empty market data with a timeout signal', () => {
  for (const args of [[], ['--top', '2']]) {
    const result = runHot(args, 'async (url, options) => { if (!(options.signal instanceof AbortSignal)) throw new Error("missing timeout"); return {ok: true, json: async () => []}; }');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).gainers, []);
  }
});

test('market response shape and fetch errors are explained', () => {
  for (const data of [{}, [null], [{ symbol: 'BTCUSDT', lastPrice: 'bad', priceChangePercent: '1', quoteVolume: '2' }]]) {
    const result = runHot([], `async () => ({ok: true, json: async () => (${JSON.stringify(data)})})`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /回應格式錯誤/);
  }
  for (const mock of ['async () => { throw new Error("timed out"); }', 'async () => ({ok: false, status: 429})']) {
    const result = runHot([], mock);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /行情 API 失敗/);
  }
});

test('valid market rows respect --top', () => {
  const rows = ['BTC', 'ETH', 'BNB'].map((coin, index) => ({symbol: `${coin}USDT`, lastPrice: '10', priceChangePercent: String(index), quoteVolume: '30000000'}));
  const result = runHot(['--top', '1'], `async () => ({ok: true, json: async () => (${JSON.stringify(rows)})})`);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).gainers.length, 1);
  assert.equal(JSON.parse(result.stdout).gainers[0].coin, 'BNB');
});

test('publish rejects missing or empty status before lint or credentials', () => {
  const directory = mkdtempSync(join(tmpdir(), 'square-status-'));
  try {
    const draft = join(directory, 'draft.md');
    for (const text of ['plain draft', '---\nstatus:\n---\nbody', '---\nstatus:   \n---\nbody']) {
      writeFileSync(draft, text);
      const result = spawnSync(process.execPath, [publish, draft], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /缺少有效的 status:/);
    }
    writeFileSync(draft, '---\nstatus: posted\n---\nbody');
    const result = spawnSync(process.execPath, [publish, draft], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /已經發過/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
