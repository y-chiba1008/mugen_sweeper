# 🔧 開発者向けドキュメント

## プロジェクト構造

```
mugen_sweeper/
├── src/
│   ├── components/    # Reactコンポーネント
│   ├── config/        # 設定ファイル（gameConfig.ts等）
│   ├── context/       # Context API
│   ├── db/            # IndexedDB（Dexie.js）関連
│   ├── lib/           # ユーティリティ関数
│   ├── logic/         # ゲームロジック
│   ├── types/          # 型定義
│   ├── utils/          # ユーティリティ
│   ├── App.tsx        # メインアプリケーション
│   └── main.tsx       # エントリーポイント
├── docs/              # ドキュメント
│   ├── overview.md    # 全体概要・要件定義
│   ├── develop.md      # このファイル
│   └── designs/        # 主要機能・大規模改修の設計・計画
├── public/            # 静的ファイル
└── package.json       # プロジェクト設定
```

## 利用可能なスクリプト

- `pnpm dev`: 開発サーバーを起動
- `pnpm build`: 本番用ビルドを作成（`tsc -b && vite build`）
- `pnpm lint`: ESLintでコードをチェック
- `pnpm preview`: ビルド結果をプレビュー
- `pnpm test`: Vitestでテストを実行（`vitest --run`）

## 設定ファイル

ゲームバランスに関わる値は `src/config/gameConfig.ts` にまとめている。

| 定数 | 説明 | 初期値 |
|---|---|---|
| `MINE_PROBABILITY` | 地雷の配置確率 | `0.25` |
| `INITIAL_LIVES` | 初期ライフ数 | `3` |
| `LIFE_BONUS_THRESHOLD` | ライフ追加の閾値（スコア） | `1000` |
| `GLOBAL_SEED` | 擬似乱数生成に使う固定シード | `123456789` |
| `SAVE_DATA_VERSION` | セーブデータのバージョン | `'2.0.0'` |

`SAVE_DATA_VERSION` を変更すると、互換性のない既存のセーブデータは破棄され新規ゲームとして開始される（詳細は [designs/db-design.md](designs/db-design.md) を参照）。

## テスト

- テストランナー: Vitest（jsdom環境）
- テストファイルの命名規則
  - ロジックファイル: `*.test.ts`（例: `gameLogic.test.ts`）
  - Reactコンポーネント: `*.test.tsx`（例: `BoardView.test.tsx`）
- IndexedDBのテストには `fake-indexeddb` を使用

## コーディング規約

- すべてのコンポーネントは `src/components/` 以下に配置し、PascalCase + `.tsx` で命名する
- TypeScriptの型は明確に定義し、`any` の使用は避ける
- スタイリングはTailwind CSSのユーティリティクラスを優先する。カスタムCSSが必要な場合は `src/index.css` に記述する
- 複雑なロジックや意図には日本語でコメントを追加する
- 型エラーは厳格に修正し、未使用の変数は削除する

## プロジェクト管理

- **リポジトリ**: y-chiba1008/mugen_sweeper
- **プロジェクト管理**: [mugen sweeper project](https://github.com/users/y-chiba1008/projects/2)（GitHub Projects）

## 関連ドキュメント

- [overview.md](overview.md): アプリケーションの全体概要・要件定義
- [designs/](designs/): 主要機能や大規模改修の設計・計画ドキュメント
- [AGENTS.md](../AGENTS.md): コーディングエージェント向けの指示
