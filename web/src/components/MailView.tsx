import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, EmailItem, Folder } from "../types";
import { fetchEmails } from "../lib/api";
import { copyToClipboard, extractCode } from "../lib/code";

type Props = {
  account: Account | null;
};

export function MailView({ account }: Props) {
  const [folder, setFolder] = useState<Folder>("all");
  const [count, setCount] = useState(10);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setEmails([]);
    setError(null);
    setActiveIdx(0);
  }, [account?.id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = async (acc: Account, f: Folder, c: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetchEmails(acc, f, c, 50000, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setEmails(resp.emails);
      setActiveIdx(0);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const active = emails[activeIdx];
  const activeCode = useMemo(
    () => (active ? extractCode(`${active.subject}\n${active.body_html || active.body}`) : null),
    [active]
  );

  const handleCopyCode = async (code: string) => {
    const ok = await copyToClipboard(code);
    showToast(ok ? `已复制验证码 ${code}` : "复制失败");
  };

  if (!account) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-slate-400">
        请先选择左侧账号
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{account.email}</div>
          <div className="text-xs text-slate-400">{account.remark || "无备注"}</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value as Folder)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="all">全部 (收件 + 垃圾)</option>
            <option value="INBOX">收件箱</option>
            <option value="Junk">垃圾邮件</option>
          </select>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} 封
              </option>
            ))}
          </select>
          <button
            onClick={() => load(account, folder, count)}
            disabled={loading}
            className="rounded-md bg-brand-500 px-4 py-1 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? "拉取中..." : "获取邮件"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-96 flex-col border-r border-slate-200 bg-white">
          <div className="flex-1 overflow-y-auto">
            {emails.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                {loading ? "" : "点击右上角“获取邮件”"}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {emails.map((m, i) => {
                  const code = extractCode(`${m.subject}\n${m.body_html || m.body}`);
                  return (
                    <li
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`cursor-pointer px-4 py-3 hover:bg-slate-50 ${
                        i === activeIdx ? "bg-brand-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {m.subject}
                        </div>
                        {m.folder === "Junk" && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                            垃圾
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{m.from}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="truncate text-xs text-slate-400">{m.date}</span>
                        {code && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopyCode(code);
                            }}
                            className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-mono text-white hover:bg-emerald-600"
                          >
                            {code}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {active ? (
            <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-lg font-semibold text-slate-900">{active.subject}</h1>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-500 sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">发件人:</span> {active.from}
                </div>
                <div>
                  <span className="text-slate-400">时间:</span> {active.date}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">收件人:</span> {active.to}
                </div>
              </div>
              {activeCode && (
                <div className="mt-4 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div>
                    <div className="text-xs text-emerald-700">检测到验证码</div>
                    <div className="font-mono text-2xl font-bold tracking-widest text-emerald-700">
                      {activeCode}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleCopyCode(activeCode)}
                    className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                  >
                    复制
                  </button>
                </div>
              )}
              <MailBody html={active.body_html} text={active.body} />
              {active.has_attachments && (
                <div className="mt-4 text-xs text-slate-400">📎 含附件</div>
              )}
            </article>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              选择左侧邮件查看详情
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function MailBody({ html, text }: { html?: string; text: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const [showSource, setShowSource] = useState(false);

  const srcDoc = useMemo(() => {
    if (!html) return "";
    const safe = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
      html,body{margin:0;padding:0;background:#fff;color:#111;font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;word-break:break-word;}
      img{max-width:100%;height:auto;}
      a{color:#2754dc;}
      table{max-width:100%;}
    </style></head><body>${safe}</body></html>`;
  }, [html]);

  const onLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.min(2000, Math.max(160, doc.body.scrollHeight + 16));
    setHeight(h);
  };

  if (!html) {
    return (
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
        {text}
      </pre>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={() => setShowSource((v) => !v)}
          className="text-xs text-slate-400 hover:text-brand-600"
        >
          {showSource ? "查看渲染" : "查看纯文本"}
        </button>
      </div>
      {showSource ? (
        <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-sans text-sm leading-relaxed text-slate-700">
          {text}
        </pre>
      ) : (
        <iframe
          ref={iframeRef}
          sandbox="allow-popups allow-same-origin"
          srcDoc={srcDoc}
          onLoad={onLoad}
          className="w-full rounded-md border border-slate-200 bg-white"
          style={{ height }}
          title="email-body"
        />
      )}
    </div>
  );
}
