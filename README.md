# Outlook IMAP API

A FastAPI service that fetches emails from Outlook / Microsoft 365 accounts via OAuth2 + IMAP (XOAUTH2). Designed to be exposed as a small HTTP API so other services can pull mail without dealing with token refresh and IMAP wire protocol themselves.

> 中文版: [README.zh-CN.md](./README.zh-CN.md)

## Features

- OAuth2 refresh-token flow against `login.microsoftonline.com`
- IMAP XOAUTH2 against `outlook.office365.com:993`
- Fetch latest N emails from `INBOX`, `Junk`, or both (`folder=all`)
- Plain-text body extraction (HTML fallback with tag/entity stripping)
- Attachment detection
- Two input styles: structured JSON, or one-line `email----password----client_id----refresh_token`

## Project layout

```
outlook-api/
├── main.py              # FastAPI entry
├── requirements.txt
└── app/
    ├── auth.py          # OAuth2 token exchange
    ├── imap_client.py   # IMAP fetcher
    ├── models.py        # Pydantic schemas
    └── api.py           # Routes
```

## Quick start

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python main.py
```

Service listens on `http://0.0.0.0:8001`. Interactive docs at `http://localhost:8001/docs`.

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
      "body": "...",
      "has_attachments": false,
      "folder": "INBOX"
    }
  ]
}
```

### POST /api/v1/emails/by-token-line

Same response, different input. Useful when your credentials are stored in the
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
- Restrict CORS as needed

## License

MIT (or whatever you choose — replace this line).
