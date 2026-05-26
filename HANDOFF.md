# Mochimon 引き継ぎドキュメント

演奏団体向けもちものリスト管理アプリ。
メンバーの持ち物を登録し、誰が今何を持っているかを管理・移転できる。

---

## 外部サービス一覧

| サービス | 用途 | 接続方法 |
|---|---|---|
| GitHub (`nama1223/Mochimon`) | ソースコード管理 / GitHub Pages で公開 | git push → GitHub Actions が自動ビルド＆デプロイ |
| Google Apps Script (GAS) | バックエンドAPI | フロントからHTTPS POSTリクエスト |
| Google スプレッドシート | データベース | GASがスクリプトプロパティのIDで操作 |
| GitHub Secrets | 環境変数の管理 | `VITE_GAS_URL` にGASのウェブアプリURLを保存 |

### 公開URL
- **アプリ本体**: `https://nama1223.github.io/Mochimon/`
- **GASウェブアプリ**: GitHub Secrets `VITE_GAS_URL` に設定済み（実際のURLはGASエディタで確認）
- **スプレッドシートID**: `1aQTumsE-Cbzep1nuwmup8MfmCf-FWTDFhOl2H4Ek0hs`

---

## ローカルのファイル構成

```
C:\Users\nama1\Desktop\出力ファイル\FFFTP\Mochimon\
├── gas/
│   └── Code.gs              ← GASバックエンド（スプレッドシート操作）
├── public/
│   ├── .nojekyll            ← GitHub Pages用（Jekyllを無効化）
│   ├── Mochimon192.png      ← ファビコン・アイコン用画像
│   ├── Mochimon512.png
│   └── Mochimon948.png      ← AuthPageのメインキャラクター画像
├── src/
│   ├── types/index.ts       ← 全型定義（OrgInfo / Member / Category / Item / TransferRecord）
│   ├── config.ts            ← GAS_URL定数・LocalStorageキー・管理者トリガー文字列
│   ├── App.tsx              ← 画面ルーティング（auth / admin / app）
│   ├── hooks/
│   │   ├── useOrgAuth.ts    ← ログイン済み団体リストのLocalStorage管理
│   │   └── useData.ts       ← 全データ取得・更新ロジック（楽観的更新付き）
│   ├── utils/
│   │   └── gasApi.ts        ← GASへのPOSTリクエスト関数群
│   └── components/
│       ├── AuthPage.tsx/css      ← ログイン画面
│       ├── AdminPage.tsx/css     ← 管理者画面（団体作成・削除）
│       ├── MainPage.tsx/css      ← メイン画面（最も複雑）
│       ├── SideMenu.tsx/css      ← サイドメニュー
│       ├── RegisterModal.tsx/css ← アイテム追加・編集モーダル
│       ├── TransferModal.tsx/css ← 移転先選択モーダル
│       ├── AllItemsView.tsx/css  ← 全アイテム一覧ビュー
│       └── TransferHistoryView.tsx/css ← 移転履歴ビュー
├── .github/workflows/deploy.yml ← GitHub Actions設定
├── vite.config.ts           ← base・PWA設定（変更注意）
├── package.json
└── index.html
```

---

## GASバックエンドの構造

`gas/Code.gs` がすべてのAPIを担う。エントリポイントは `doPost(e)`。

### APIの呼び出し方（フロント→GAS）

```javascript
// Content-Type ヘッダーを付けない（CORSプリフライトを回避するため）
fetch(GAS_URL, {
  method: 'POST',
  redirect: 'follow',
  body: JSON.stringify({ action: 'アクション名', ...パラメータ })
})
// レスポンス: { ok: true, data: ... } または { ok: false, error: 'メッセージ' }
```

### 実装済みアクション一覧

| action | 説明 |
|---|---|
| `auth` | パスワードで団体ログイン |
| `admin/verify` | 管理者トークン検証 |
| `admin/orgs` | 全団体一覧取得（管理者用） |
| `admin/orgs/create` | 団体作成 |
| `admin/orgs/delete` | 団体削除 |
| `getData` | 指定団体の全データ取得（members/categories/items/transfers） |
| `members/upsert` | メンバー追加・更新（idあれば更新、なければ追加） |
| `members/delete` | メンバー削除 |
| `members/reorder` | メンバー順序変更 |
| `categories/upsert` | カテゴリ追加・更新 |
| `categories/delete` | カテゴリ削除 |
| `categories/reorder` | カテゴリ順序変更 |
| `items/upsert` | アイテム追加・更新 |
| `items/delete` | アイテム削除 |
| `items/reorder` | アイテム順序変更 |
| `items/transfer` | アイテムを別メンバーへ移転（履歴も記録） |
| `transfers/deleteInvalid` | itemNameが空の不正な移転履歴を一括削除 |

### スプレッドシートのシート構成

| シート名 | 列 |
|---|---|
| `orgs` | id, name, password |
| `members` | id, orgId, name, order |
| `categories` | id, orgId, name, order |
| `items` | id, orgId, name, categoryId, categoryName, ownerId, ownerName, order, lastTransferDate |
| `transfers` | id, orgId, itemId, itemName, fromMemberId, fromMemberName, toMemberId, toMemberName, transferDate |

### GASのスクリプトプロパティ（GASエディタで設定）

| キー | 値 |
|---|---|
| `SPREADSHEET_ID` | `1aQTumsE-Cbzep1nuwmup8MfmCf-FWTDFhOl2H4Ek0hs` |
| `ADMIN_TOKEN` | 管理者用の任意文字列 |

---

## LocalStorageの使い方

| キー | 内容 |
|---|---|
| `mochimon_orgs` | ログイン済み団体リスト `OrgInfo[]`（AuthPageで「以前ログインした団体」として表示） |
| `mochimon_page_<orgId>` | 最後に開いていたページ状態 `{ memberId: string \| null, view: ViewMode }` |

---

## 認証フロー

- **一般ユーザー**: AuthPageでパスワード入力 → GAS `auth` アクション → 成功したらLocalStorageに保存
- **管理者**: パスワード欄に `namakanri` と入力 → 管理者画面へ（`config.ts` の `ADMIN_TRIGGER`）
- **招待URL**: `?invite=<orgId>&n=<orgName>` のパラメータがあればApp.tsx起動時に自動ログイン

---

## デプロイ手順

### フロントエンド（自動）
`main` ブランチにpushすると `.github/workflows/deploy.yml` が自動実行：
1. `npm ci` → `npm run build`（環境変数 `VITE_GAS_URL` はGitHub Secretsから注入）
2. `dist/` を GitHub Pages に配置（`sw.js` / `manifest.webmanifest` も含む）

PWAのService Workerは新しいビルドが配置されると、既存のユーザーが次回起動時に自動更新される。

### GASバックエンド（手動）
`gas/Code.gs` を変更した場合は手動で再デプロイが必要：
1. [script.google.com](https://script.google.com) でプロジェクトを開く
2. `Code.gs` を最新内容に更新
3. 「デプロイ」→「デプロイを管理」→「新しいバージョン」で再デプロイ
4. URLが変わる場合はGitHub Secretsの `VITE_GAS_URL` も更新し、再pushが必要

---

## アプリ固有の注意点（修正時の落とし穴）

### 1. CORSを回避するためContent-Typeを付けない
`gasApi.ts` の `fetch` は **`Content-Type` ヘッダーを意図的に省略**している。
付けるとCORSプリフライト（OPTIONS）が発生しGASがブロックする。絶対に追加しないこと。

### 2. GASの `getValues()` は日付をDateオブジェクトで返す
スプレッドシートの日付セルは `getValues()` で `Date` オブジェクトになる。
`sheetToObjects()` 内で `Utilities.formatDate(val, tz, 'yyyy-MM-dd')` に変換済み。
GASコードで日付列を追加する場合は同様の変換が必要。

### 3. 楽観的更新とtmp_ID
アイテム追加時、GASのレスポンスを待たずに `tmp_TIMESTAMP_RAND` の仮IDで即座にUI更新する。
GASが本物のIDを返したら差し替える。
**移転操作はtmp_IDのまま行えないようガード済み**（`if (itemId.startsWith('tmp_'))` でブロック）。

### 4. 移転のリトライロジック
`useData.ts` の `transferItemTo()` は失敗時に最大3回リトライ（遅延: 0ms → 2000ms → 4000ms）。
全失敗した場合はローカル状態をロールバックしてトーストでエラー表示する。

### 5. vite.config.ts の base 設定
```typescript
base: '/Mochimon/'
```
これがないとGitHub Pages上でアセットのパスが壊れる。変更しないこと。

### 6. 画像は `public/` に置く
Viteは `public/` ディレクトリの中身だけをそのままホスティングする。
`src/` 以外の画像を追加する場合は `public/` に配置し、参照パスは `/Mochimon/画像名.png` とする。

### 7. GASの再デプロイを忘れない
`gas/Code.gs` を編集してpushしても**GASは自動更新されない**。
GASエディタで手動デプロイしないと変更が反映されない。

### 8. PWA（Service Worker）の注意点

**`vite-plugin-pwa` を使用**（`vite.config.ts` に設定）。ビルド時に自動生成される：
- `dist/sw.js` — Service Worker本体（Workboxベース）
- `dist/manifest.webmanifest` — アプリマニフェスト
- `dist/workbox-*.js` — Workboxランタイム

**更新の仕組み（`registerType: 'autoUpdate'`）**：
- オンライン起動時にSWが新バージョンを検出 → `skipWaiting()` で即時切り替え → ページ自動リロード
- オフライン時はキャッシュ済みの静的アセット（HTML/JS/CSS/画像）から起動する
- GASへのAPIコールはキャッシュされないため、オフライン時はデータ取得不可（起動はできる）

**アイコン設定**（`vite.config.ts` の `manifest.icons`）：
- `Mochimon192.png`（192×192）— 標準アイコン
- `Mochimon512.png`（512×512、`purpose: 'any maskable'`）— Android適応型アイコン
- `background_color: '#ffffff'` — Androidの適応型アイコン背景色（白）

**PWAを修正する際の注意**：
- `vite.config.ts` の `manifest` セクションを変更したらビルドしてpushするだけでOK
- アイコン画像を差し替える場合は `public/` 内のファイルを置き換える

### 9. 同時書き込みの競合（スケール上限）
GASに `LockService` を使っていないため、多数の同時アクセスがあると
`reorderMembers` / `reorderItems` などの「読んで→書く」系の操作で競合が起きる可能性がある。
数団体・数人同時程度なら実用上問題ない。

---

## ローカル開発

```bash
cd "C:\Users\nama1\Desktop\出力ファイル\FFFTP\Mochimon"

# 開発サーバー起動
npm run dev
# → http://localhost:5173/Mochimon/ で動作
# ※GAS_URLが必要なため、src/config.ts に直接URLを書くか .env.local を作成

# 型チェック
npx tsc --noEmit

# ビルド確認
npm run build
```

`.env.local`（ローカル開発用、gitignore済み）:
```
VITE_GAS_URL=https://script.google.com/macros/s/xxxx/exec
```
