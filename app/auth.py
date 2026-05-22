import requests

TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token"
DEFAULT_SCOPE = "https://outlook.office.com/IMAP.AccessAsUser.All offline_access"


class AuthError(Exception):
    pass


def get_access_token(client_id: str, refresh_token: str, scope: str = DEFAULT_SCOPE,
                     timeout: int = 30) -> dict:
    """通过 refresh_token 换取 access_token, 返回原始 token 响应。"""
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "scope": scope,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=timeout,
    )

    if resp.status_code != 200:
        try:
            payload = resp.json()
        except Exception:
            payload = {"raw": resp.text}
        raise AuthError(f"获取 access_token 失败: {payload}")

    data = resp.json()
    if "access_token" not in data:
        raise AuthError(f"响应缺少 access_token: {data}")
    return data


def parse_token_line(line: str) -> dict:
    """解析 email----password----client_id----refresh_token 格式。"""
    parts = [p.strip() for p in line.strip().split("----")]
    if len(parts) < 4:
        raise ValueError("token_line 格式应为 email----password----client_id----refresh_token")
    return {
        "email": parts[0],
        "password": parts[1],
        "client_id": parts[2],
        "refresh_token": parts[3],
    }
