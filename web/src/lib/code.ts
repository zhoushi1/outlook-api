const STRONG_PATTERNS: RegExp[] = [
  /(?:验证码|校验码|动态码|安全码|verification code|security code|one[\s-]?time\s+code|otp|passcode|access\s+code|登录码|登入码|确认码)[^\n0-9A-Za-z]{0,16}([0-9A-Za-z]{4,8})/i,
  /\b([0-9A-Za-z]{4,8})\s*(?:是|为)?(?:您|你)?(?:的)?(?:验证码|校验码|动态码|安全码|登录码|登入码|确认码)/,
  /\bcode[:：\s]+([0-9A-Za-z]{4,8})\b/i,
];

const WEAK_PATTERN = /\b([0-9]{4,8})\b/g;

function looksLikeCssOrColor(ctx: string): boolean {
  return /#[0-9a-fA-F]{3,8}\b/.test(ctx) || /(?:color|background|font|padding|margin|border|width|height|rgba?|hsla?)\s*[:(]/i.test(ctx);
}

function looksLikeYearOrId(s: string, ctx: string): boolean {
  if (/^(19|20)\d{2}$/.test(s)) return true;
  if (/(?:port|id|uid|order|tracking|invoice|receipt|user|account)[#:\s-]*$/i.test(ctx.slice(-32))) return true;
  return false;
}

function stripHtmlAndStyle(text: string): string {
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/style\s*=\s*"[^"]*"/gi, " ")
    .replace(/style\s*=\s*'[^']*'/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function extractCode(text: string): string | null {
  if (!text) return null;
  const cleaned = stripHtmlAndStyle(text).replace(/\s+/g, " ");

  for (const re of STRONG_PATTERNS) {
    const m = cleaned.match(re);
    if (m && m[1] && /[0-9]/.test(m[1])) return m[1];
  }

  let bestMatch: { code: string; score: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = WEAK_PATTERN.exec(cleaned)) !== null) {
    const code = m[1];
    const start = Math.max(0, m.index - 24);
    const end = Math.min(cleaned.length, m.index + code.length + 24);
    const ctx = cleaned.slice(start, end);
    if (looksLikeCssOrColor(ctx)) continue;
    if (looksLikeYearOrId(code, ctx)) continue;
    let score = 0;
    if (code.length === 6) score += 3;
    else if (code.length === 4 || code.length === 8) score += 2;
    else score += 1;
    if (!bestMatch || score > bestMatch.score) bestMatch = { code, score };
  }
  WEAK_PATTERN.lastIndex = 0;

  return bestMatch?.code ?? null;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
