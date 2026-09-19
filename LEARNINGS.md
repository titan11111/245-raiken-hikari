# 245-raiken-hikari LEARNINGS

## 2026-09-19 フォルダ改名・ハーネス操作盤
- `245-day069` → `245-raiken-hikari`。エントリを `raiken-hikari.html` から `index.html` へ。
- ハーネス契約（75/25・`#game-shell` 一式）と左右拳／雷ため／天雷拳／ミュート／ポーズを操作盤へ。
- 旧ベストキー `raiken-best` は読み、新規保存は `tg.245.best` にも書く。
- 操作盤をDOM先頭に置き、CSS `order` で視覚順を維持。ハーネスの first タップが操作ボタンになる。
- harness PASS: `docs/harness-reports/245-raiken-hikari-2026-09-19T07-13-40-704Z.md`。iPhoneシミュレータは未実施。

## 2026-09-19 公開（GitHub Pages）
- URL: https://titan11111.github.io/245-raiken-hikari/ （HTTP 200・Pages status=built を実測）
- publish.sh が OGP タグを index.html へ挿入したため、**公開実体で harness を取り直した**: `docs/harness-reports/245-raiken-hikari-2026-09-19T07-20-26-389Z.md` → 14項目すべて PASS
- 学び: publish.sh の OGP 挿入は harness の後に走る。公開後の実体で1回取り直さないと、証跡が公開物と一致しない
- 未検証: iPhone実機（harness は Playwright/WebKit 390px のみ）
