from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import router

DIST_DIR = Path(__file__).parent / "web" / "dist"

app = FastAPI(
    title="Outlook IMAP API",
    description="基于 Microsoft OAuth2 + IMAP 的 Outlook 取件服务",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

if DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="web")
else:
    @app.get("/")
    def root():
        return {
            "service": "outlook-api",
            "docs": "/docs",
            "hint": "前端未构建, 执行: cd web && pnpm install && pnpm build",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
