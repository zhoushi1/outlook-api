import email
import imaplib
import re
from email.header import decode_header
from typing import List, Tuple

IMAP_HOST = "outlook.office365.com"
IMAP_PORT = 993


class ImapError(Exception):
    pass


def _decode_mime_header(value) -> str:
    if not value:
        return ""
    parts = []
    for chunk, charset in decode_header(value):
        if isinstance(chunk, bytes):
            try:
                parts.append(chunk.decode(charset or "utf-8", errors="replace"))
            except (LookupError, TypeError):
                parts.append(chunk.decode("utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts)


def _html_to_text(raw: str) -> str:
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw,
                 flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r"<[^>]+>", "", raw)
    return (raw.replace("&nbsp;", " ")
               .replace("&lt;", "<")
               .replace("&gt;", ">")
               .replace("&amp;", "&")
               .replace("&quot;", '"'))


def _extract_body(msg) -> Tuple[str, str, bool]:
    """返回 (纯文本正文, 原始HTML正文, 是否含附件)"""
    plain = ""
    html_raw = ""
    has_attachments = False

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")

            if "attachment" in disp.lower():
                has_attachments = True
                continue

            if ctype == "text/plain" and not plain:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    plain = part.get_payload(decode=True).decode(charset, errors="replace")
                except Exception:
                    pass
            elif ctype == "text/html" and not html_raw:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    html_raw = part.get_payload(decode=True).decode(charset, errors="replace")
                except Exception:
                    pass
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            payload = msg.get_payload(decode=True)
            if payload is not None:
                decoded = payload.decode(charset, errors="replace")
                if msg.get_content_type() == "text/html":
                    html_raw = decoded
                else:
                    plain = decoded
        except Exception:
            plain = str(msg.get_payload())

    text = plain or (_html_to_text(html_raw) if html_raw else "")
    return text.strip(), html_raw.strip(), has_attachments


ALL_FOLDERS = ("INBOX", "Junk")


def _fetch_one_folder(imap, folder: str, count: int, body_limit: int) -> Tuple[int, List[dict]]:
    status, _ = imap.select(folder)
    if status != "OK":
        raise ImapError(f"无法选择文件夹: {folder}")

    status, message_ids = imap.search(None, "ALL")
    if status != "OK":
        raise ImapError(f"搜索邮件失败: {folder}")

    id_list = message_ids[0].split()
    total = len(id_list)
    if total == 0:
        return 0, []

    latest_ids = id_list[-count:] if total > count else id_list
    latest_ids = latest_ids[::-1]

    results: List[dict] = []
    for msg_id in latest_ids:
        status, msg_data = imap.fetch(msg_id, "(RFC822)")
        if status != "OK" or not msg_data or not msg_data[0]:
            continue

        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)

        subject = _decode_mime_header(msg.get("Subject")) or "(无主题)"
        from_addr = _decode_mime_header(msg.get("From")) or ""
        to_addr = _decode_mime_header(msg.get("To")) or ""
        date = msg.get("Date") or ""
        body, body_html, has_attachments = _extract_body(msg)

        if body_limit and len(body) > body_limit:
            body = body[:body_limit] + "..."
        if body_limit and len(body_html) > body_limit * 4:
            body_html = body_html[:body_limit * 4] + "..."

        results.append({
            "subject": subject,
            "from": from_addr,
            "to": to_addr,
            "date": date,
            "body": body,
            "body_html": body_html,
            "has_attachments": has_attachments,
            "folder": folder,
        })

    return total, results


def fetch_emails(email_addr: str, access_token: str, folder: str = "INBOX",
                 count: int = 10, body_limit: int = 2000) -> dict:
    """通过 IMAP 拉取指定文件夹的最新邮件。

    folder 支持:
        - "INBOX" / "Junk" / 其他具体文件夹名
        - "all" (不区分大小写): 收件箱 + 垃圾箱合并, 各取 count 封

    返回:
        {
            "total_in_folder": int,
            "emails": [ {subject, from, to, date, body, has_attachments, folder}, ... ]
        }
    """
    auth_string = f"user={email_addr}\x01auth=Bearer {access_token}\x01\x01"

    try:
        imap = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    except Exception as e:
        raise ImapError(f"连接 IMAP 服务器失败: {e}") from e

    try:
        try:
            imap.authenticate("XOAUTH2", lambda _x: auth_string.encode())
        except imaplib.IMAP4.error as e:
            raise ImapError(f"IMAP 认证失败: {e}") from e

        if folder.lower() == "all":
            total_sum = 0
            all_results: List[dict] = []
            for f in ALL_FOLDERS:
                t, items = _fetch_one_folder(imap, f, count, body_limit)
                total_sum += t
                all_results.extend(items)
            return {"total_in_folder": total_sum, "emails": all_results}

        total, results = _fetch_one_folder(imap, folder, count, body_limit)
        return {"total_in_folder": total, "emails": results}
    finally:
        try:
            imap.close()
        except Exception:
            pass
        try:
            imap.logout()
        except Exception:
            pass
