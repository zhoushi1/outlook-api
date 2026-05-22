# Outlook IMAP API + Web

A FastAPI service that fetches emails from Outlook / Microsoft 365 via OAuth2 refresh token + IMAP (XOAUTH2). Ships with a React frontend (`web/`) so a single `python main.py` serves both the API and a mailbox management UI.

> 中文版: [README.zh-CN.md](./README.zh-CN.md)

## Features

### Backend (FastAPI)
- OAuth2 refresh-token flow against `login.microsoftonline.com`
- IMAP XOAUTH2 against `outlook.office365.com:993`
- Fetch latest N emails from `INBOX`, `Junk`, or both (`folder=all`)
- Returns plain-text body (`body`) **and** raw HTML body (`body_html`) so clients can choose how to render
- Attachment detection
- Two input styles: structured JSON, or one-line `email----password----client_id----refresh_token`
- Built-in static hosting of `web/dist/` — single port serves API + frontend

### Frontend (`web/`, React + Vite + Tailwind)
- Account management: bulk paste one-line credentials or single-form entry; data stays in **browser localStorage only** — never uploaded
- Pick account → choose folder / count → "Fetch emails"; switching accounts mid-fetch automatically aborts the in-flight request
- Two-pane list + detail layout; HTML emails render inside a sandboxed iframe (`<script>`, `<link>`, `on*` handlers stripped — prevents XSS and 404 noise from CDN-hardcoded stylesheets)
- Verification-code auto-detect + one-click copy (keyword-anchored strong match with weak-numeric fallback; filters CSS colors, year-like numbers, and order/invoice IDs)

## Project layout

```
outlook-api/
├── main.py              # FastAPI entry (static hosting included)
├── requirements.txt
├── app/
│   ├── auth.py          # OAuth2 token exchange
│   ├── imap_client.py   # IMAP fetcher (text + html)
│   ├── models.py        # Pydantic schemas
│   └── api.py           # Routes
└── web/                 # React frontend
    ├── package.json
    ├── vite.config.ts   # /api proxied to :8001
    ├── src/
    │   ├── App.tsx
    │   ├── components/  # AccountList / MailView / AddAccountDialog
    │   └── lib/         # api / storage / code (verification extract)
    └── dist/            # built by `pnpm build`, mounted by FastAPI
```

## Quick start

### 1. Backend

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

### 2. Frontend (first time, or after frontend code changes)

```bash
cd web
pnpm install
pnpm build                      # produces web/dist/
cd ..
```

### 3. Run

```bash
python main.py
```

Open in browser:
- `http://localhost:8001/` — mailbox UI
- `http://localhost:8001/docs` — FastAPI interactive docs
- `http://localhost:8001/api/v1/health` — health check

> If you don't want the UI, skip step 2; the root path returns a hint message.

### Frontend dev mode (HMR)

In `web/`, in a separate terminal:

```bash
pnpm dev                        # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:8001`, so no CORS setup needed. Backend still served by `python main.py`.

## API reference

Base path: `/api/v1`

| Method | Path | Purpose |
|---|---|---|
| GET  | `/health` | Health check |
| POST | `/token`  | Exchange refresh_token for access_token |
| POST | `/emails` | Fetch emails (structured fields) |
| POST | `/emails/by-token-line` | Fetch emails using `----` joined credential line |

### POST /api/v1/emails

Request:
```json
{
  "email": "user@outlook.com",
  "client_id": "<microsoft oauth client id>",
  "refresh_token": "<refresh token>",
  "folder": "INBOX",
  "count": 10,
  "body_limit": 2000
}
```

`folder` accepts:
- `INBOX` — inbox (default)
- `Junk` — spam folder
- `all` — fetch from both INBOX and Junk, merged into one response. `count` becomes per-folder.
- Any other valid IMAP folder name on the account

`body_limit` is the truncation length for `body` (characters). `0` disables truncation. `body_html` is truncated at `body_limit * 4`.

Response:
```json
{
  "email": "user@outlook.com",
  "folder": "INBOX",
  "total_in_folder": 152,
  "fetched": 10,
  "emails": [
    {
      "subject": "...",
      "from": "...",
      "to": "...",
      "date": "...",
      "body": "plain text...",
      "body_html": "<html>...raw html...</html>",
      "has_attachments": false,
      "folder": "INBOX"
    }
  ]
}
```

### POST /api/v1/emails/by-token-line

Same response, different input. Useful when credentials are stored in the
common `email----password----client_id----refresh_token` line format:

```json
{
  "token_line": "user@outlook.com----pwd----client_id----refresh_token",
  "folder": "all",
  "count": 5
}
```

## Client examples

**curl**
```bash
curl -X POST http://localhost:8001/api/v1/emails \
  -H "Content-Type: application/json" \
  -d '{"email":"x@outlook.com","client_id":"...","refresh_token":"...","count":5}'
```

**Python**
```python
import requests
r = requests.post("http://localhost:8001/api/v1/emails", json={
    "email": "x@outlook.com",
    "client_id": "...",
    "refresh_token": "...",
    "folder": "all",
    "count": 10,
})
print(r.json())
```

**JavaScript / Node**
```js
const r = await fetch("http://localhost:8001/api/v1/emails", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "x@outlook.com",
    client_id: "...",
    refresh_token: "...",
    count: 10,
  }),
});
console.log(await r.json());
```

## Error codes

| Status | Meaning |
|---|---|
| 400 | Malformed input (e.g. token_line format wrong) |
| 401 | OAuth token exchange failed |
| 502 | IMAP connection / authentication / fetch failure |

## Production checklist

This server has **no built-in authentication**. Before exposing it publicly:

- Add an API key / Bearer token middleware
- Put it behind HTTPS (Nginx, Caddy, or a managed reverse proxy)
- Add rate limiting
- Never log raw `refresh_token` or `access_token` values
- CORS defaults to `allow_origins=["*"]` — restrict to your actual frontend origin
- Frontend account data lives in browser localStorage only; users lose it when clearing cache. If you need persistence, wire up a backend store with proper encryption

## Where do credentials come from?

Register an application in Azure AD / Microsoft Entra, grant `IMAP.AccessAsUser.All` + `offline_access`, and capture the `refresh_token` after a user signs in. Out of scope here — plenty of guides online.

## License

[MIT](./LICENSE)
