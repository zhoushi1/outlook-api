# Outlook IMAP API

基于 FastAPI 的 Outlook / Microsoft 365 邮件取件服务,通过 OAuth2 刷新令牌换取 access_token,再用 XOAUTH2 走 IMAP 协议拉邮件。封装成 HTTP 接口对外提供,调用方不用关心 token 刷新和 IMAP 协议细节。

> English: [README.md](./README.md)

## 特性

- OAuth2 refresh_token 流程,对接 `login.microsoftonline.com`
- IMAP XOAUTH2 认证,连接 `outlook.office365.com:993`
- 支持收件箱 `INBOX`、垃圾箱 `Junk`,或一次性拉两个 (`folder=all`)
- 自动解析邮件正文 (优先纯文本,HTML 自动去标签和实体)
- 附件标记
- 支持两种入参:结构化 JSON,或一行式 `email----password----client_id----refresh_token`

## 目录结构

```
outlook-api/
├── main.py              # FastAPI 入口
├── requirements.txt
└── app/
    ├── auth.py          # OAuth2 token 换取
    ├── imap_client.py   # IMAP 取件
    ├── models.py        # Pydantic 模型
    └── api.py           # 路由
```

## 快速开始

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python main.py
```

服务监听 `http://0.0.0.0:8001`,交互式文档在 `http://localhost:8001/docs`。

## 接口说明

统一前缀:`/api/v1`

| 方法 | 路径 | 用途 |
|---|---|---|
| GET  | `/health` | 健康检查 |
| POST | `/token`  | 用 refresh_token 换 access_token |
| POST | `/emails` | 拉邮件 (字段分开传) |
| POST | `/emails/by-token-line` | 拉邮件 (一行式凭据) |

### POST /api/v1/emails

请求:
```json
{
  "email": "user@outlook.com",
  "client_id": "微软 OAuth Client ID",
  "refresh_token": "刷新令牌",
  "folder": "INBOX",
  "count": 10,
  "body_limit": 2000
}
```

`folder` 取值:
- `INBOX` - 收件箱 (默认)
- `Junk` - 垃圾箱
- `all` - 收件箱 + 垃圾箱合并,此模式下 `count` 表示每个文件夹各取多少封
- 账号下其他有效 IMAP 文件夹名

`body_limit`:正文截断长度,`0` 表示不截断。

返回:
```json
{
  "email": "user@outlook.com",
  "folder": "INBOX",
  "total_in_folder": 152,
  "fetched": 10,
  "emails": [
    {
      "subject": "邮件主题",
      "from": "sender@x.com",
      "to": "user@outlook.com",
      "date": "...",
      "body": "正文...",
      "has_attachments": false,
      "folder": "INBOX"
    }
  ]
}
```

### POST /api/v1/emails/by-token-line

返回结构同上,适合凭据以 `email----password----client_id----refresh_token` 这种一行式存储的场景:

```json
{
  "token_line": "user@outlook.com----pwd----client_id----refresh_token",
  "folder": "all",
  "count": 5
}
```

## 调用示例

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

## 错误码

| 状态码 | 含义 |
|---|---|
| 400 | 入参格式错误 (例如 token_line 分隔不对) |
| 401 | OAuth 换 token 失败 (client_id / refresh_token 不对、过期等) |
| 502 | IMAP 连接 / 认证 / 取件失败 |

## 上生产前注意

当前服务**没有任何鉴权**,直接对外暴露等于把所有人的邮箱授权给公网。上线前至少做这几件事:

- 加 API Key / Bearer Token 中间件,只放过持有 key 的请求
- 套 HTTPS (Nginx、Caddy 或云上托管反代)
- 加限流,防止刷接口
- 不要把 `refresh_token` / `access_token` 原文打到日志
- 按需限制 CORS

## 凭据怎么来

需要在 Azure AD / Microsoft Entra 创建一个应用,授予 `IMAP.AccessAsUser.All` + `offline_access` 权限,引导用户授权后保存返回的 `refresh_token`。这一步不在本项目范围内,网上有大量资料。

## License

MIT (或换成你想用的协议)。
