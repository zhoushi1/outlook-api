from fastapi import APIRouter, HTTPException

from .auth import AuthError, get_access_token, parse_token_line
from .imap_client import ImapError, fetch_emails
from .models import (
    AccessTokenRequest,
    AccessTokenResponse,
    FetchEmailsByTokenLineRequest,
    FetchEmailsRequest,
    FetchEmailsResponse,
)

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/token", response_model=AccessTokenResponse)
def issue_access_token(req: AccessTokenRequest):
    try:
        data = get_access_token(req.client_id, req.refresh_token)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return AccessTokenResponse(
        access_token=data["access_token"],
        expires_in=data.get("expires_in"),
        token_type=data.get("token_type"),
        scope=data.get("scope"),
    )


@router.post("/emails", response_model=FetchEmailsResponse)
def fetch_emails_endpoint(req: FetchEmailsRequest):
    try:
        token_data = get_access_token(req.client_id, req.refresh_token)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))

    try:
        result = fetch_emails(
            email_addr=req.email,
            access_token=token_data["access_token"],
            folder=req.folder,
            count=req.count,
            body_limit=req.body_limit,
        )
    except ImapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return FetchEmailsResponse(
        email=req.email,
        folder=req.folder,
        total_in_folder=result["total_in_folder"],
        fetched=len(result["emails"]),
        emails=result["emails"],
    )


@router.post("/emails/by-token-line", response_model=FetchEmailsResponse)
def fetch_emails_by_token_line(req: FetchEmailsByTokenLineRequest):
    try:
        creds = parse_token_line(req.token_line)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        token_data = get_access_token(creds["client_id"], creds["refresh_token"])
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))

    try:
        result = fetch_emails(
            email_addr=creds["email"],
            access_token=token_data["access_token"],
            folder=req.folder,
            count=req.count,
            body_limit=req.body_limit,
        )
    except ImapError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return FetchEmailsResponse(
        email=creds["email"],
        folder=req.folder,
        total_in_folder=result["total_in_folder"],
        fetched=len(result["emails"]),
        emails=result["emails"],
    )
