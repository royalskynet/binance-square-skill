---
name: binance-square
description: 經營幣安廣場：抓行情、爆倉、恐懼指數與熱門話題，照官方四步公式寫繁中老玩家短評，過去 AI 味檢查，使用者點頭後才發。說「幣安廣場」「發廣場」「廣場草稿」「寫盤面短評」時用。
---

# 幣安廣場

工作目錄是這個 skill 的資料夾。寫之前讀一次 `STYLE.md`。

## 流程

1. 抓資料。草稿裡的數字只能從這些輸出拿。
   - `node scripts/hot.mjs`：幣安現貨價格、漲跌、成交額。
   - 幣安廣場首頁 `https://www.binance.com/zh-TC/square`：用網頁讀取工具抓「熱門話題」和「最高搜尋量」。話題標題就是 `#話題` 的原文。
   - [Antalpha MCP](https://mcp-skills.ai.antalpha.com/mcp)（免認證，選用）：
     - `data-derivatives`（`asset=btc`，`metrics=["funding_rate","liquidations"]`）：爆倉金額、多空比。
     - `data-sentiment`（`days=7`）：恐懼貪婪指數。
     - `crypto-news-headlines`（`hours=6`）：近幾小時頭條，找「為什麼」。
     - `data-flows`（`metrics=["etf_flow"]`）：BTC ETF 淨流量。
     - `crypto-social`（`view=trending`）：社群熱度。`view=surge` 雜訊大，不用。
     - 沒接 Antalpha 就只用 `hot.mjs` 和新聞，草稿裡少寫「為什麼」。
2. 挑角度。優先順序：熱門話題能對上行情 → 主流幣大動作 → 成交額夠大的異動幣。一篇只講一件事。
3. 照 `STYLE.md` 的四步公式寫草稿，存到 `drafts/<YYYY-MM-DD-HHMM>.md`，開頭放：

   ```
   ---
   status: draft
   source_at: <hot.mjs 的 at 欄位>
   ---
   ```

4. 檢查：`node scripts/lint.mjs drafts/<檔名>`。有 ✗ 就改，重跑到通過。同一份改 3 次還不過，把錯誤貼給使用者。
5. 自己再對一次：每個「為什麼」對得上第 1 步的哪份資料。對不上就刪。
6. 把通過的草稿全文貼給使用者，問「發嗎」。
7. 使用者對這一份說「發」，才跑 `node scripts/publish.mjs drafts/<檔名>`，回報 Link。使用者改字就改完重跑第 4 步。

## 規則

- 發文是對外公開，收不回來。每一篇都要使用者對該篇點頭，之前的同意不算數。
- 每天最多 3 篇（`SQUARE_DAILY_CAP` 可調）。官方建議每天 1–3 篇、固定時間發。
- API key 用環境變數 `BINANCE_SQUARE_OPENAPI_KEY`，或存到官方位置 `~/.config/binance-square/openapi-key`。不印 key、不放進指令參數。
- 錯誤碼對照看 `vendor/binance-skills-hub/skills/binance/square-post/SKILL.md` 的 Common Errors。`20002`／`20022` 是敏感詞，改字重發。
