import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint } from '../scripts/lint.mjs';

const GOOD = `$BTC 一天跌 4.9%，被清掉的多單有 3.56 億美元。

24 小時爆倉 3.97 億美元，九成是多單，金額是近 30 天中位數的快 5 倍。恐懼貪婪指數掉到 13，BTC ETF 昨天又流出 1.85 億美元。

這三個放在一起，代表槓桿多單在被清，現貨買盤沒有進來接。爆倉清完之前，反彈很容易再被砸回去。

所以我現在不抄底。如果爆倉量降回平常水準、BTC 站回 68,000，我才會試小倉位。跌破 63,000 就繼續等。

$BNB 跌 7.4%，比大餅深。平台幣在大盤出事的時候通常跌更多，我不會先碰它。

你們是等站回再進，還是已經在分批撿了？

#比特币走低 #BTC`;

test('乾淨草稿通過', () => {
  assert.deepEqual(lint(GOOD), []);
});

test('沒有代幣標籤要擋', () => {
  assert.ok(lint(GOOD.replaceAll('$', '')).some((e) => e.includes('代幣')));
});

test('AI 味句型要擋', () => {
  const bad = GOOD.replace('所以我現在不抄底。', '這不是恐慌而是洗盤。值得注意的是我不抄底。');
  const errs = lint(bad);
  assert.ok(errs.some((e) => e.includes('二元對比')));
  assert.ok(errs.some((e) => e.includes('填充詞')));
});

test('序號與冒號揭示要擋', () => {
  const bad = GOOD.replace('所以我現在', '1. 所以我現在').replace('你們是', '重點：你們是');
  const errs = lint(bad);
  assert.ok(errs.some((e) => e.includes('序號')));
  assert.ok(errs.some((e) => e.includes('冒號')));
});

test('簡體字要擋', () => {
  assert.ok(lint(GOOD.replace('不抄底', '不抄底这')).some((e) => e.includes('簡體')));
});

test('喊單用語要擋', () => {
  assert.ok(lint(GOOD.replace('我不會先碰它', '這波穩賺')).some((e) => e.includes('喊單')));
});

test('字數過長與段落太長要擋', () => {
  const long = GOOD.replace('我不會先碰它。', '我不會先碰它。'.repeat(40));
  const errs = lint(long);
  assert.ok(errs.some((e) => e.startsWith('字數')));
  assert.ok(errs.some((e) => e.includes('每段')));
});

test('只列數字沒觀點要擋', () => {
  const flat = GOOD.replace('代表', '有').replace('所以', '').replace('如果', '').replaceAll('站回', '回到').replace('跌破', '低於');
  const errs = lint(flat);
  assert.ok(errs.some((e) => e.includes('因果')));
  assert.ok(errs.some((e) => e.includes('條件')));
});

test('結尾沒問句要擋', () => {
  assert.ok(lint(GOOD.replace('已經在分批撿了？', '已經在分批撿了。')).some((e) => e.includes('問句')));
});

test('標籤數量要擋', () => {
  assert.ok(lint(GOOD.replace(' #BTC', '')).length === 0);
  assert.ok(lint(GOOD.replace('#比特币走低 #BTC', '')).some((e) => e.includes('#話題')));
  assert.ok(lint(GOOD.replace('$BNB', '$BNB $ETH $SOL')).some((e) => e.includes('上限')));
});

test('#話題 裡的簡體不算錯', () => {
  assert.ok(!lint(GOOD).some((e) => e.includes('簡體')));
});
