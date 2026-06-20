# 🗺️ ミニマップ（俯瞰マップ）機能 設計・実装計画書

## 1. 概要

| 項目 | 内容 |
|---|---|
| 機能名 | ミニマップ（俯瞰マップ） |
| 目的 | 無限に広がる盤面の全体像をドット絵スタイルで俯瞰表示する |
| 関連要件 | FR-100（無限盤面）、FR-119（現在地へ移動）の拡張 |
| 関連ドキュメント | [overview.md](../overview.md)、[db-design.md](./db-design.md) |

### 1.1 実現したい機能

- HUDにボタンを設置し、押下でモーダルを表示する
- モーダル内に、これまで読み込まれた盤面全体をドット絵スタイルで表示する
- ミニマップ上の任意の点をクリックすると、メインビューがその座標へスムーズスクロールする
- メインビューが現在表示している範囲を示すマーカー（矩形）をミニマップ上に重ねて表示する
  - モーダル表示中はメインビューの操作（盤面移動・ズーム）を受け付けない仕様とする（マーカーはモーダルを開いた時点の表示範囲を固定で示す）
- 将来的に、チャンクが新規に読み込まれて地図が広がる様子をアニメーション化する

---

## 2. 技術選定

### 2.1 結論：Canvas API（2D Context）

| 観点 | Canvas API | SVG | DOM（div） |
|---|---|---|---|
| 大量セル描画 | ◎ 数万〜数十万ドットでも高速 | △ DOM要素数に比例して劣化 | × 規模的に破綻する |
| 要素数の制約 | なし（ピクセル描画のみ） | 要素数増加でレンダリング・メモリが重くなる | DOM要素数=セル数で激重 |
| アニメーション（チャンク出現時の描き足し） | ◎ `requestAnimationFrame`で滑らかに制御しやすい | △ 要素追加・削除のコストが乗る | × |
| ズーム・パン演出 | ◎ `scale`/`translate`で容易 | ○ viewBox操作で可能 | △ |
| 個別セルのクリック判定 | △ 自前で座標→セル変換が必要 | ◎ 要素ごとにイベントが付く | ◎ |
| 実装コスト | 中（座標計算は自前実装） | 低〜中 | 低（ただし規模で破綻） |

### 2.2 選定理由

- 既存設計（チャンク16×16単位でのデータ管理）と相性が良く、プレイが進むとチャンク数は数百〜数千（セル数は数万〜数十万）に達し得るため、1セル=1要素方式（SVG/DOM）は要素数がボトルネックになる。
- Canvasはピクセルを描くだけなので、セル数の増加に対して描画コール数を管理可能な範囲に保てる。
- 将来のアニメーション要件（チャンクのフェードイン等）も、`requestAnimationFrame`ループ内でピクセル単位の制御が可能なため対応しやすい。

---

## 3. UI構成

### 3.1 ボタン

- HUD（画面上部）に既存の「現在地へ移動」ボタン（FR-119）と並べて「マップ」ボタンを追加する
- 押下でモーダルを開く

### 3.2 モーダル

- モーダル内にCanvas要素を1つ配置し、そこに俯瞰マップを描画する
- モーダルを閉じる手段（×ボタン・オーバーレイクリック・Escキー）を用意する
- モーダルのサイズ（Canvasの表示領域）は固定値ではなく、モーダルを開いた時点で現在読み込み済みの全チャンクが収まるように動的に決定する。スクロールは不要とする
  - 読み込み済み全セルのワールド座標の範囲（最小値・最大値）から、表示すべきワールド座標の幅・高さを算出する
  - モーダルの表示可能領域（画面サイズに応じた最大幅・最大高さ）に対して、上記の幅・高さが収まるように `dotSize` を逆算する（`dotSize = Math.min(maxWidth / worldWidth, maxHeight / worldHeight)`）
  - チャンクが少ない場合は `dotSize` が大きくなり、チャンクが多い場合は小さくなる。最小1pxを下限とする

### 3.3 セルの色分け（ドット絵スタイル）

| セル状態 | 色 | 備考 |
|---|---|---|
| 未開封セル（旗なし） | グレー★ | プレイ画面の未開封セルの色に合わせる |
| 未開封セル（旗あり） | 黄 | |
| 開封済みセル（非地雷） | 白★ | プレイ画面の開封済みセルの色に合わせる |
| 開封済みセル（地雷） | 赤 | |

> ★の色は、プレイ画面側のセルカラー定義を `src/config/gameConfig.ts` に共通定数として定義し、ミニマップ描画でも同じ値を参照する。色の二重管理を避けるため、定義元はここに一本化する。

---

## 4. 座標変換ロジック

### 4.1 全体の流れ

```
[ワールド座標（セルデータ）]
      ↓ ① 描画
[ミニマップ上のピクセル座標]

[ミニマップ上のクリック座標 (mx, my)]
      ↓ ② 逆算
[ワールド座標 (worldX, worldY)]
      ↓ ③ 既存の「現在地へ移動」ロジックに渡す
[メインビューのスクロール位置]
```

### 4.2 ① ワールド座標 → ミニマップ描画

- モーダルを開いた時点で、読み込み済み全チャンクのセルから、ワールド座標の最小値・最大値を求め、描画原点（`minimapOriginX`, `minimapOriginY`）を決定する
- 同時に、モーダルの表示可能領域（最大幅・最大高さ）に対して読み込み済み範囲全体が収まるように `dotSize` を算出する（詳細は3.2節）。スクロールは発生させない
- 描画関数は `minimapOriginX/Y` と `dotSize` を呼び出し側に返す（クリック時の逆変換で再利用するため）

```javascript
function getMinimapLayout(allCells, maxWidth, maxHeight) {
  const xs = allCells.map(c => c.x);
  const ys = allCells.map(c => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const worldWidth = Math.max(...xs) - minX + 1;
  const worldHeight = Math.max(...ys) - minY + 1;

  const dotSize = Math.max(
    1,
    Math.min(maxWidth / worldWidth, maxHeight / worldHeight)
  );

  return { minimapOriginX: minX, minimapOriginY: minY, dotSize };
}
```

### 4.3 ② ミニマップ座標 → ワールド座標（クリック時）

```javascript
function minimapToWorld(mx, my, minimapOriginX, minimapOriginY, dotSize) {
  const worldX = minimapOriginX + Math.floor(mx / dotSize);
  const worldY = minimapOriginY + Math.floor(my / dotSize);
  return { worldX, worldY };
}
```

### 4.4 ③ ワールド座標 → ビュー移動

- FR-119「現在地へ移動」と同一の関数（`scrollViewSmoothlyTo`等）を再利用する。実装を一本化することで保守性を確保する。

```javascript
function jumpToWorldPosition(worldX, worldY) {
  scrollViewSmoothlyTo(worldX, worldY); // FR-119と同じ関数
  closeMinimapModal(); // ジャンプ後はモーダルを閉じる
}
```

### 4.5 現在地マーカー（ビューポート表示矩形）の描画

メインビューが現在表示しているワールド座標の範囲を、ミニマップ上に矩形でオーバーレイ表示する。④の逆変換（メインビュー → ミニマップ座標）に相当する。

```javascript
function drawViewportIndicator(ctx, viewportWorldRect, minimapOriginX, minimapOriginY, dotSize) {
  const rectX = (viewportWorldRect.x - minimapOriginX) * dotSize;
  const rectY = (viewportWorldRect.y - minimapOriginY) * dotSize;
  const rectW = viewportWorldRect.width * dotSize;
  const rectH = viewportWorldRect.height * dotSize;

  ctx.strokeStyle = COLOR_VIEWPORT_INDICATOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(rectX, rectY, rectW, rectH);
}
```

- `viewportWorldRect` は、メインビューの現在のスクロール位置・ズーム倍率・キャンバスサイズから算出する（メインビュー側の状態を参照）
- モーダル表示中はメインビューの操作（盤面移動・ズーム等）を受け付けない仕様とするため、マーカーはモーダルを開いた時点で一度だけ算出・描画すればよく、表示中の動的な再描画やイベントリスナーの付け外しは不要

---

## 5. 描画処理の実装方針

### 5.1 描画関数の骨格

```javascript
function getCellColor(cell) {
  if (!cell.revealed) {
    return cell.flagged ? COLOR_FLAG_YELLOW : COLOR_UNOPENED_GRAY;
  }
  return cell.isMine ? COLOR_MINE_RED : COLOR_OPENED_WHITE;
}

function drawMinimap(ctx, allCells, dotSize, minimapOriginX, minimapOriginY) {
  for (const cell of allCells) {
    const screenX = (cell.x - minimapOriginX) * dotSize;
    const screenY = (cell.y - minimapOriginY) * dotSize;
    ctx.fillStyle = getCellColor(cell);
    ctx.fillRect(screenX, screenY, dotSize, dotSize);
  }
}
```

### 5.2 クリックイベント処理

```javascript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const { worldX, worldY } = minimapToWorld(mx, my, minimapOriginX, minimapOriginY, dotSize);
  jumpToWorldPosition(worldX, worldY);
});
```

### 5.3 高解像度ディスプレイ（Retina等）対応

`devicePixelRatio` を考慮しないと、見た目の精細さやクリック判定がズレる。以下のいずれかの方式に統一すること。

```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = displayWidth * dpr;
canvas.height = displayHeight * dpr;
canvas.style.width = `${displayWidth}px`;
canvas.style.height = `${displayHeight}px`;
ctx.scale(dpr, dpr);
```

> `ctx.scale(dpr, dpr)` を使う場合、クリックイベント側の座標計算は「CSS上の座標系」で行うこと。5.2の `scaleX/scaleY` 補正と二重に適用しないよう、どちらか一方の方式に統一する。

---

## 6. パフォーマンス対策（将来のアニメーション拡張を踏まえて）

- チャンクごとに**オフスクリーンCanvas**（`OffscreenCanvas` または非表示の `<canvas>`）に描画してキャッシュし、変化のあったチャンクのみ再描画する設計にしておく
- 新規チャンク出現時のアニメーション（フェードイン等）は、該当チャンクの領域に対して `requestAnimationFrame` で透明度（alpha）を0→1へ数フレームかけて遷移させる形で実装する
- 全件再描画はチャンク数が増えるほどコストが増すため、「変化があったチャンクだけ再描画」を基本方針とする

---

## 7. データ取得方針

- ミニマップ描画に必要なセルデータは、既存の `db-design.md` の `loadAllChunks()`（起動時の全件取得）または `chunks` テーブルの内容をそのまま利用する
- 新規にテーブル追加・スキーマ変更は不要（既存の `meta` / `chunks` 構成のまま対応可能）

---

## 8. 実装タスク一覧（コーディングエージェント向け）

| # | タスク | 関連セクション |
|---|---|---|
| 1 | HUDに「マップ」ボタンを追加する | 3.1 |
| 2 | モーダルコンポーネントを作成し、ボタン押下で開閉できるようにする | 3.2 |
| 3 | モーダル内にCanvas要素を配置する | 3.2 |
| 4 | モーダルを開いた時点で、読み込み済み全セルからミニマップ描画原点（`minimapOriginX/Y`）と、表示領域に収まる`dotSize`を動的に計算する関数（`getMinimapLayout`）を実装する | 3.2, 4.2 |
| 5 | セル状態に応じた色分け描画関数（`getCellColor` / `drawMinimap`）を実装する | 3.3, 5.1 |
| 6 | プレイ画面のセルカラー定義を `src/config/gameConfig.ts` に共通定数として定義し、ミニマップ描画にも同じ値を使用する | 3.3 |
| 7 | Canvasクリック時のミニマップ座標→ワールド座標変換関数を実装する | 4.3 |
| 8 | クリック時に既存の「現在地へ移動」ロジック（FR-119）を呼び出してビューをジャンプさせる | 4.4 |
| 9 | メインビューの現在の表示範囲（ビューポート）をワールド座標で算出する関数を実装する | 4.5 |
| 10 | ビューポート範囲をミニマップ上に矩形でオーバーレイ描画する（`drawViewportIndicator`） | 4.5 |
| 11 | モーダル表示中はメインビューの操作（盤面移動・ズーム）を無効化する | 4.5 |
| 12 | 高解像度ディスプレイ対応（`devicePixelRatio`）を実装し、描画とクリック判定の座標系を統一する | 5.3 |
| 13 | （将来拡張）チャンクごとのオフスクリーンCanvasキャッシュと差分再描画の仕組みを実装する | 6 |
| 14 | （将来拡張）新規チャンク出現時のフェードインアニメーションを実装する | 6 |

---

## 9. 未確定事項・要確認ポイント

特になし。