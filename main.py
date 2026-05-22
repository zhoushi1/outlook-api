from fastapi import FastAPI

from app.api import router

app = FastAPI(
    title="Outlook IMAP API",
    description="基于 Microsoft OAuth2 + IMAP 的 Outlook 取件服务",
    version="0.1.0",
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
def root():
    return {"service": "outlook-api", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
