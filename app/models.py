from typing import List, Optional
from pydantic import BaseModel, Field


class FetchEmailsRequest(BaseModel):
    email: str = Field(..., description="邮箱地址")
    client_id: str = Field(..., description="Microsoft OAuth Client ID")
    refresh_token: str = Field(..., description="Refresh Token")
    folder: str = Field("INBOX", description="文件夹: INBOX / Junk / all (all 表示收件箱+垃圾箱)")
    count: int = Field(10, ge=1, le=100, description="获取邮件数量, all 模式下表示每个文件夹各取的数量")
    body_limit: int = Field(2000, ge=0, description="正文截断长度, 0 表示不截断")


class FetchEmailsByTokenLineRequest(BaseModel):
    """支持 email----password----client_id----refresh_token 一行式参数"""
    token_line: str = Field(..., description="格式: email----password----client_id----refresh_token")
    folder: str = Field("INBOX", description="文件夹: INBOX / Junk / all")
    count: int = Field(10, ge=1, le=100)
    body_limit: int = Field(2000, ge=0)


class EmailItem(BaseModel):
    subject: str
    from_: str = Field(..., alias="from")
    to: str = ""
    date: str
    body: str
    body_html: str = ""
    has_attachments: bool = False
    folder: str = ""

    model_config = {"populate_by_name": True}


class FetchEmailsResponse(BaseModel):
    email: str
    folder: str
    total_in_folder: int
    fetched: int
    emails: List[EmailItem]


class AccessTokenRequest(BaseModel):
    client_id: str
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    expires_in: Optional[int] = None
    token_type: Optional[str] = None
    scope: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
