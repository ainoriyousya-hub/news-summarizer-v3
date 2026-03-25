# ニュース要約アプリ v3

毎朝ニュースを自動収集し、Anthropic API で日本語要約して表示する Next.js 14 アプリです。  
公開用ページは `/`、管理用ページは `/admin` で、収集ボタンは管理用にだけ表示されます。

## 使用技術

- Next.js 14 (App Router) + React + TypeScript
- Tailwind CSS
- Vercel Blob
- `@anthropic-ai/sdk`
- `rss-parser`
- cron-job.org

## セットアップ

1. 依存関係をインストールします。

```bash
npm install
```

2. 環境変数ファイルを作成します。

```bash
cp .env.example .env.local
```

3. `.env.local` に値を設定します。

```env
ANTHROPIC_API_KEY=
BLOB_READ_WRITE_TOKEN=
CRON_SECRET=
```

4. 開発サーバーを起動します。

```bash
npm run dev
```

## 画面構成

- `/`
  - 公開用ページです。
  - `NewsDashboard` に `isAdmin={false}` を明示して渡しています。
  - 収集ボタンは表示しません。
- `/admin`
  - 管理用ページです。
  - `NewsDashboard` に `isAdmin={true}` を明示して渡しています。
  - 手動収集ボタンを表示します。

## 自動収集

- cron-job.org から毎日 `22:00 UTC` に `/api/cron` を呼び出します。
- ヘッダーは `Authorization: Bearer {CRON_SECRET}` を設定します。
- Vercel Cron は使いません。

### cron-job.org の設定手順

1. cron-job.org で新しいジョブを作成します。
2. URL に `https://<your-domain>/api/cron` を設定します。
3. 実行時刻を毎日 `22:00 UTC` に設定します。
4. Method は `GET` にします。
5. Header に `Authorization: Bearer {CRON_SECRET}` を設定します。
6. テスト実行で成功レスポンスを確認します。

## Vercel デプロイ

1. Vercel にこのプロジェクトをデプロイします。
2. Project Settings > Environment Variables に以下を設定します。
   - `ANTHROPIC_API_KEY`
   - `BLOB_READ_WRITE_TOKEN`
   - `CRON_SECRET`
3. Blob ストアは Private 設定で使用してください。
4. デプロイ後に `/admin` から手動収集を確認します。

## Blob 保存仕様

- 保存パスは `daily-news/YYYY-MM-DD.json` です。
- `put()` は `access: "private"` と `allowOverwrite: true` を指定しています。
- `get()` は `access: "private"` を指定しています。
- 読み込み失敗時は `null` を返します。

## トラブル対応

### RSS が一部取れない

- RSS 配信元が 404 やタイムアウトを返すと、そのソースだけスキップします。
- サーバーログの日本語 `console.error` を確認してください。

### 要約が失敗する

- `ANTHROPIC_API_KEY` を確認してください。
- Anthropic API の利用状況を確認してください。

### データが表示されない

- `/admin` で収集を実行してください。
- Vercel Blob にデータが保存されているか確認してください。
- `/api/news?date=YYYY-MM-DD` で `data: null` になっていないか確認してください。
