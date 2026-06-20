# IndexedDB 設計ドキュメント

## 概要

| 項目 | 内容 |
|---|---|
| 使用技術 | IndexedDB（Dexie.js） |
| セーブスロット | なし（1ブラウザ = 1データ） |
| データベース名 | `MinesweeperSave` |

---

## テーブル構成

### `meta` テーブル

スコア・ライフなど軽量なゲーム状態を保持する。  
変化頻度が高いため、`chunks` とは分離して読み書きする。

| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | `string` (PK) | 固定値 `'save'` |
| `version` | `string` | セーブデータのバージョン |
| `score` | `number` | 現在のスコア |
| `lives` | `number` | 残機数 |
| `highScore` | `number` | ハイスコア |
| `nextLifeScoreThreshold` | `number` | 次の残機獲得スコア |
| `gameOver` | `boolean` | ゲームオーバーフラグ |
| `savedAt` | `Date` | 最終保存日時 |

```javascript
db.version(1).stores({
  meta: 'id',
});
```

---

### `chunks` テーブル

マップのセルデータを **16×16 単位のチャンク** にまとめて保持する。  
チャンク座標 `(cx, cy)` をキーとし、その中に属するセルをまとめて保存する。

| カラム名 | 型 | 説明 |
|---|---|---|
| `cx` | `number` (PK) | チャンクのX座標 |
| `cy` | `number` (PK) | チャンクのY座標 |
| `cells` | `Cell[]` | チャンク内のセル一覧 |

#### Cell の構造

| カラム名 | 型 | 説明 |
|---|---|---|
| `x` | `number` | セルのX座標（ワールド座標） |
| `y` | `number` | セルのY座標（ワールド座標） |
| `isMine` | `boolean` | 地雷フラグ |
| `adjacentMines` | `number` | 隣接地雷数 |
| `revealed` | `boolean` | 開示済みフラグ |
| `flagged` | `boolean` | フラグ設置済みフラグ |

```javascript
db.version(1).stores({
  meta:   'id',
  chunks: '[cx+cy]',
});
```

---

## チャンク設計

```
CHUNK_SIZE = 16

セル座標 → チャンク座標の変換:
  cx = Math.floor(x / 16)
  cy = Math.floor(y / 16)

例:
  セル (x=0,  y=0)  → チャンク (cx=0,  cy=0)
  セル (x=15, y=15) → チャンク (cx=0,  cy=0)
  セル (x=16, y=0)  → チャンク (cx=1,  cy=0)
  セル (x=-1, y=-1) → チャンク (cx=-1, cy=-1)
```

---

## 読み書き方針

| タイミング | 操作 | 対象テーブル | 備考 |
|---|---|---|---|
| 起動時 | 読み込み | `meta` + `chunks`（全件） | 初回ロードのみ全件取得 |
| スコア・ライフ変化時 | 書き込み | `meta` のみ | 軽量・高頻度 |
| セル操作時（開く・フラグ） | 書き込み | `chunks`（差分のみ） | 変化したセルが属するチャンクのみ更新 |
| 画面スクロール時 | 読み込み | `chunks`（範囲指定） | 表示範囲のチャンクのみ取得 |

---

## 主要な操作の実装イメージ

### DB初期化

```javascript
import Dexie from 'dexie';

const db = new Dexie('MinesweeperSave');

db.version(1).stores({
  meta:   'id',
  chunks: '[cx+cy]',
});
```

### meta の保存・読み込み

```javascript
// 保存
async function saveMeta(gameState) {
  await db.meta.put({
    id: 'save',
    savedAt: new Date(),
    version: gameState.version,
    score: gameState.score,
    lives: gameState.lives,
    highScore: gameState.highScore,
    nextLifeScoreThreshold: gameState.nextLifeScoreThreshold,
    gameOver: gameState.gameOver,
  });
}

// 読み込み
async function loadMeta() {
  return await db.meta.get('save');
}
```

### chunks の保存（差分更新）

```javascript
const CHUNK_SIZE = 16;

function toChunkCoord(v) {
  return Math.floor(v / CHUNK_SIZE);
}

async function saveChunks(changedCells) {
  // 変化したセルをチャンクごとにグループ化
  const chunkMap = new Map();
  for (const cell of changedCells) {
    const cx = toChunkCoord(cell.x);
    const cy = toChunkCoord(cell.y);
    const key = `${cx},${cy}`;
    if (!chunkMap.has(key)) chunkMap.set(key, { cx, cy, cells: [] });
    chunkMap.get(key).cells.push(cell);
  }

  // 既存チャンクとマージして保存
  const records = [];
  for (const { cx, cy, cells } of chunkMap.values()) {
    const existing = await db.chunks.get([cx, cy]);
    const cellMap = new Map((existing?.cells ?? []).map(c => [`${c.x},${c.y}`, c]));
    for (const cell of cells) cellMap.set(`${cell.x},${cell.y}`, cell);
    records.push({ cx, cy, cells: [...cellMap.values()] });
  }
  await db.chunks.bulkPut(records);
}
```

### chunks の読み込み（範囲指定）

```javascript
// 全チャンク読み込み（起動時）
async function loadAllChunks() {
  const chunks = await db.chunks.toArray();
  return chunks.flatMap(c => c.cells);
}

// 範囲指定読み込み（スクロール時）
async function loadChunksInRange(x1, y1, x2, y2) {
  const cx1 = toChunkCoord(x1), cx2 = toChunkCoord(x2);
  const cy1 = toChunkCoord(y1), cy2 = toChunkCoord(y2);

  const result = [];
  for (let cx = cx1; cx <= cx2; cx++) {
    const chunks = await db.chunks
      .where('[cx+cy]')
      .between([cx, cy1], [cx, cy2])
      .toArray();
    result.push(...chunks.flatMap(c => c.cells));
  }
  return result;
}
```

### 起動時の初期化フロー

```javascript
async function init() {
  const meta  = await loadMeta();
  const cells = await loadAllChunks();

  if (meta) {
    restoreGameState({ ...meta, cells });
  } else {
    startNewGame();
  }
}
```
