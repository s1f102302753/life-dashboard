# Life Dashboard

スマホ向けの生活統合ダッシュボードの最小構成です。`frontend` は Next.js + Tailwind CSS、`backend` は Django で構成しています。フロントは Django API からダッシュボードデータを取得します。

個人開発でも、友人に渡す前提なら「ローカル専用のまま作らない」ことが重要です。このプロジェクトは、環境変数で開発用と本番用を切り替えられるようにしてあります。

## Frontend

```bash
cd frontend
npm install
npm run dev
```

必要に応じて API の接続先を変更する場合は `NEXT_PUBLIC_DASHBOARD_API_BASE_URL` を設定します。デフォルトは `/api/backend` で、Next.js から Django へプロキシされます。

`.env.local` を使う場合は `frontend/.env.example` を元に作成してください。`DASHBOARD_API_PROXY_TARGET` に Django の実 URL を設定すると、ブラウザからは同一オリジンのまま接続できます。

## Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

本番用の環境変数は `backend/.env.example` を参照してください。`backend/.env` として配置すれば Django が読み込みます。最低でも `DJANGO_SECRET_KEY`、`DJANGO_DEBUG=False`、`DJANGO_ALLOWED_HOSTS` は必須です。

AI エージェント機能を有効にする場合は、`OPENAI_API_KEY` を `backend/.env` に設定してください。用途別モデルは `OPENAI_AGENT_MODEL` と `OPENAI_RECEIPT_MODEL` で切り替えられます。未設定時は AI 提案はルールベースの fallback に自動で切り替わります。

## 画面設計

- メイン画面は概要カード中心、詳細は機能別画面へ分離
- 自炊記録、天気予報を独立画面に切り出し、スマホからタブレットまでレスポンシブ対応
- `SectionCard` のような共通 UI を用意して、機能拡張しやすい構成に分離
- フロントエンドは `frontend/lib/api.ts` の API 層経由で取得
- クライアント側でロードし、通信中と通信失敗時の状態を明示
- 操作完了時はトーストでフィードバック
- 自炊記録詳細では検索、絞り込み、編集、削除に対応
- 画像保存は `backend/dashboard/storage.py` を介していて、外部ストレージへ差し替えやすい構成

## API

- `GET /`
- `GET /health`
- `GET /dashboard`
- `GET /weather`
- `GET /agent/daily-focus`
- `GET /agent/pantry-insights`
- `POST /agent/cooking-assist`
- `GET /cooking-logs`
- `POST /cooking-logs`
- `PUT /cooking-logs/<id>`
- `DELETE /cooking-logs/<id>`

## 本番運用の前提

- Django の `SECRET_KEY`、`DEBUG`、`ALLOWED_HOSTS`、CORS、CSRF 設定は環境変数で切り替えます
- フロントの API 接続先は、同一ドメイン配下なら `/api/backend` を使い、Next.js rewrite で Django に転送します
- SQLite のままでも小規模運用は可能ですが、データ保全のため `backend/db.sqlite3` は配布物に含めず永続ボリュームへ置いてください
- 料理画像は `backend/media/` に保存されるため、本番では永続ストレージかオブジェクトストレージへの差し替えを前提にしてください
- `backend/venv` や `frontend/node_modules` はリポジトリに含めません

## 本番起動

Backend:

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env
./start-prod.sh
```

Frontend:

```bash
cd frontend
npm install
npm run build
cp .env.example .env.local
./start-prod.sh
```

補足:

- `backend/start-prod.sh` は `migrate` と `collectstatic` を行ってから `gunicorn` を起動します
- `backend/.env.example` のパス系は相対パスにしてあり、配備先へそのまま載せやすくしています
- Django は DB・static・media の親ディレクトリを自動作成するため、初回起動の失敗を減らしています
- Next.js は `output=standalone` を有効にしており、配備物をまとめやすくしています

## 開発確認

```bash
cd backend
venv/bin/python manage.py test

cd ../frontend
npm run build
npm test
```

## 開発サーバーの注意

Next.js 開発サーバーで `Cannot find module './819.js'` のようなエラーが出た場合は、`.next` キャッシュ破損の可能性があります。

```bash
cd frontend
rm -rf .next
npm run dev
```
