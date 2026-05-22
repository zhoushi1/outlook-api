# Outlook IMAP API + Web

基于 FastAPI 的 Outlook / Microsoft 365 邮件取件服务,通过 OAuth2 刷新令牌换取 access_token,再用 XOAUTH2 走 IMAP 协议拉邮件。封装成 HTTP 接口,并附带一个 React 前端 (`web/`),`python main.py` 即可同时起后端 API 和邮箱管理页面。

> English: [README.md](./README.md)

## 特性

### 后端 (FastAPI)
- OAuth2 refresh_token 流程,对接 `login.microsoftonline.com`
- IMAP XOAUTH2 认证,连接 `outlook.office365.com:993`
- 支持收件箱 `INBOX`、垃圾箱 `Junk`,或一次性拉两个 (`folder=all`)
- 同时返回纯文本正文 (`body`) 和原始 HTML (`body_html`),前端可选择渲染方式
- 附件标记
- 支持两种入参:结构化 JSON,或一行式 `email----password----client_id----refresh_token`
- 内置 `web/dist/` 静态托管,单端口提供 API + 前端

### 前端 (`web/`,React + Vite + Tailwind)
- 邮箱账号管理:批量粘贴一行式凭据 / 单条表单,数据**仅存浏览器 localStorage**,不上传后端
- 选中账号 → 选择文件夹 / 邮件数 → "获取邮件",支持中途切换账号自动中断旧请求
- 邮件列表 + 详情双栏布局,HTML 邮件用沙箱 iframe 渲染 (剥离 `<script>` / `<link>` / `on*` 事件,防 XSS 与 404 噪音)
- 验证码自动识别 + 一键复制 (强匹配关键词 + 弱匹配回退,过滤 CSS 颜色、年份、订单号等假阳性)

## 目录结构

```
outlook-api/
├── main.py              # FastAPI 入口 (含静态托管)
├── requirements.txt
├── app/
│   ├── auth.py          # OAuth2 token 换取
│   ├── imap_client.py   # IMAP 取件 (text + html)
│   ├── models.py        # Pydantic 模型
│   └── api.py           # 路由
└── web/                 # React 前端
    ├── package.json
    ├── vite.config.ts   # /api 代理到 :8001
    ├── src/
    │   ├── App.tsx
    │   ├── components/  # AccountList / MailView / AddAccountDialog
    │   └── lib/         # api / storage / code (验证码提取)
    └── dist/            # pnpm build 产物 (FastAPI 自动挂载)
```

## 快速开始

### 1. 后端

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

### 2. 前端 (首次或更新前端代码后)

```bash
cd web
pnpm install
pnpm build                      # 产出 web/dist/
cd ..
```

### 3. 一键启动

```bash
python main.py
```

打开浏览器:
- `http://localhost:8001/` - 邮箱管理界面
- `http://localhost:8001/docs` - FastAPI 交互式 API 文档
- `http://localhost:8001/api/v1/health` - 健康检查

> 如果不需要前端,跳过第 2 步即可,根路径会返回提示信息。

### 前端开发模式 (HMR)

在 `web/` 目录下另开终端:

```bash
pnpm dev                        # http://localhost:5173
```

Vite 已配 `/api` 代理到 `http://localhost:8001`,无需 CORS 配置。前端改完代码生效;后端仍由 `python main.py` 提供。

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

`body_limit`:正文截断长度 (字符数),`0` 表示不截断。`body_html` 的截断长度为该值的 4 倍。

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
      "body": "纯文本正文...",
      "body_html": "<html>...原始 HTML...</html>",
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
- CORS 默认 `allow_origins=["*"]`,生产环境改成你前端实际域名
- 前端账号信息只存在浏览器 localStorage,用户清缓存就丢失;需要持久化请自行接 DB 并加密

## 凭据怎么来

需要在 Azure AD / Microsoft Entra 创建一个应用,授予 `IMAP.AccessAsUser.All` + `offline_access` 权限,引导用户授权后保存返回的 `refresh_token`。这一步不在本项目范围内,网上有大量资料。

## License

[MIT](./LICENSE)
