# 雷拳ヒカリ — 仕様

## 0. ドキュメント情報
- 対象: 245-raiken-hikari / 更新日: 2026-09-19 / ステータス: 公開

## 1. ゲーム概要
浮遊都市の屋上で、左右パンチ・雷弾・天雷拳でWAVEを生き残りスコアを伸ばすアクション。

## 2. 対象環境
GitHub Pages / iPhone Safari / 静的HTML。外部CDNなし。

## 3. 操作 / 設定UI
- 入力: 左右拳ボタン、雷ため長押し、天雷拳、キーボード←→/Space/K、キャンバスタップ
- Pointer Events + `setPointerCapture`
- ポーズ: Ⅱ / P / Escape / タブ非表示
- ミュート: `tg.245.mute` ／ ベスト: `tg.245.best`（旧 `raiken-best` を読み替え）
- 画面: 上75% `#game-stage` / 下25% `#control-deck`

## 4. 未確定事項
なし（公開ブロッカーなし）
