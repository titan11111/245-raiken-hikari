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

## 2026-09-19 旧URLの404を修復
- 症状: `https://titan11111.github.io/245-raiken-hikari/raiken-hikari.html` が 404。ゲーム本体（`/245-raiken-hikari/`）は 200 で生きていた
- 原因: 同日の改修でエントリを `raiken-hikari.html` → `index.html` に改名したため、**改名前に配ったリンクだけが死んだ**。リポジトリもPagesも正常（status=built）
- 対処: `raiken-hikari.html` を 444バイトのリダイレクト専用ページとして復活。`<meta http-equiv="refresh">` ＋ `location.replace()` の二段で、`?query` と `#hash` も引き継ぐ
- 検証: 旧URL HTTP **404 → 200**（commit `b074408` のPagesビルド完了後に実測）。正URLも 200 のまま。中身に `location.replace('./index.html' ...)` を確認
- 未検証: リダイレクトの**実際の遷移**はブラウザ挙動（meta refresh / JS）のため、curlでは追従確認していない。配信されている内容の確認まで
- 学び: **エントリファイル名を変えるときは、旧名をリダイレクトとして残す**。フォルダ改名はリポジトリごと作り直すので影響が見えやすいが、エントリ改名は「本体は200」なので気づきにくい
