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

### 【訂正】上の「404だった」は誤り（2026-09-19 同日中に判明）
- gitで裏を取った結果、`raiken-hikari.html` は**このリポジトリで一度も公開されていなかった**（`git cat-file -e <修復コミット>^:raiken-hikari.html` → 不在）。
  改名はローカルフォルダ内で完結しており、リポジトリは改名**後**に作成されている
- つまり `…/245-raiken-hikari/raiken-hikari.html` というURLは**元から存在しない**。「配ったリンクが死んだ」という上の記述は**誤り**
- 置いたリダイレクトは**害はないが、壊れていたものを直したわけではない**（将来その名前で来た人を受けるだけの保険）
- 誤認の原因: LEARNINGS.md の本文を証拠として扱ったこと。**本文は作業メモであって証拠ではない。証拠はgit履歴**
- 検出器も v2 で「git履歴に存在 かつ HEADに不在」判定へ作り直した（`_tools/check-legacy-entry.sh`）
