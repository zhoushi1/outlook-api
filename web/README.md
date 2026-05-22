# Outlook Mail Web

React + Vite + TypeScript + Tailwind 前端，调用同仓库的 FastAPI 后端 (`outlook-api`) 拉取邮件。账号信息仅保存在浏览器 localStorage，**不会上传到后端**。

## 启动

后端 (项目根目录):
```bash
python main.py        # http://localhost:8001
```

前端 (`web/` 目录):
```bash
pnpm install
pnpm dev              # http://localhost:5173
```

Vite dev 已配置 `/api` 代理到 `http://localhost:8001`，所以前端无需 CORS。

## 功能

- 批量粘贴账号: `email----password----client_id----refresh_token`
- 单个表单添加
- 切换 INBOX / Junk / 全部
- 自动提取并一键复制验证码 (4-8 位数字)
- 账号本地持久化 (localStorage)

## 构建部署

```bash
pnpm build            # 输出 web/dist/
```

可挂在 Nginx，或由 FastAPI 用 `StaticFiles` 直接托管。
