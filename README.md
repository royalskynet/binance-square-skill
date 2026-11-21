# binance-square-skill

幣安廣場經營 skill（Claude Code／任何能讀 SKILL.md 的 agent）。

抓行情與熱門話題 → 照幣安官方四步公式寫繁中短評 → 去 AI 味檢查 → 你點頭 → 發到幣安廣場。

## 做什麼

- `scripts/hot.mjs`：抓幣安現貨 24h 行情，列主流幣、漲跌榜、成交額榜。公開 API，不用 key。
- `scripts/lint.mjs`：檢查字數、版面、標籤數、因果與條件詞、結尾問句、繁體、AI 味句型、喊單用語。
- `scripts/publish.mjs`：過檢查、查每日上限，再呼叫幣安官方發文腳本。
- `STYLE.md`：寫稿規範。結構取自幣安 CreatorAcademy 的四步公式。
- `SKILL.md`：agent 的操作流程。

## 安裝

需要 Node 18 以上、`opencc`（macOS：`brew install opencc`）。

```bash
git clone https://github.com/royalskynet/binance-square-skill
cd binance-square-skill
git clone --depth 1 --filter=blob:none --sparse https://github.com/binance/binance-skills-hub vendor/binance-skills-hub
git -C vendor/binance-skills-hub sparse-checkout set skills/binance/square-post
mkdir -p drafts
node --test 'test/*.test.mjs'
```

Claude Code：把這個資料夾連結到 `~/.claude/skills/binance-square`。

API key 到幣安廣場創作者中心產生：https://www.binance.com/square/creator-center/home
存成環境變數 `BINANCE_SQUARE_OPENAPI_KEY`，或用官方的 `save-key.mjs` 存到 `~/.config/binance-square/openapi-key`。

## 選用

[Antalpha MCP](https://mcp-skills.ai.antalpha.com/mcp) 補爆倉、恐懼貪婪指數、ETF 流量和新聞頭條。不接也能跑，草稿的分析會比較薄。

## 來源

- 官方發文 skill：https://github.com/binance/binance-skills-hub/tree/main/skills/binance/square-post
- 官方四步公式整理：https://www.bnxbot.com/blog/binance-square-posting-tips-guide
- 去 AI 味句型參考：[petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop)、[lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone) 的結論（只取規則，未複製原文）。

## 授權

MIT
