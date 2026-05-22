import { useState } from "react";
import type { Account } from "../types";
import { newId, parseTokenLine } from "../lib/storage";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (accounts: Account[]) => void;
};

export function AddAccountDialog({ open, onClose, onAdd }: Props) {
  const [tab, setTab] = useState<"line" | "form">("line");
  const [text, setText] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    clientId: "",
    refreshToken: "",
    remark: "",
  });
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submitLines = () => {
    setError(null);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("请粘贴至少一行数据");
      return;
    }
    const accounts: Account[] = [];
    const failed: number[] = [];
    lines.forEach((line, idx) => {
      const parsed = parseTokenLine(line);
      if (!parsed) {
        failed.push(idx + 1);
        return;
      }
      accounts.push({
        ...parsed,
        id: newId(),
        createdAt: Date.now(),
      });
    });
    if (accounts.length === 0) {
      setError(`全部 ${lines.length} 行格式均不正确`);
      return;
    }
    if (failed.length > 0) {
      setError(`第 ${failed.join(", ")} 行格式不正确，已跳过；成功导入 ${accounts.length} 个`);
    }
    onAdd(accounts);
    setText("");
    if (failed.length === 0) onClose();
  };

  const submitForm = () => {
    setError(null);
    if (!form.email || !form.clientId || !form.refreshToken) {
      setError("email / client_id / refresh_token 必填");
      return;
    }
    onAdd([
      {
        id: newId(),
        createdAt: Date.now(),
        email: form.email.trim(),
        password: form.password.trim(),
        clientId: form.clientId.trim(),
        refreshToken: form.refreshToken.trim(),
        remark: form.remark.trim() || undefined,
      },
    ]);
    setForm({ email: "", password: "", clientId: "", refreshToken: "", remark: "" });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">添加邮箱账号</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-1 border-b border-slate-100">
            <button
              onClick={() => setTab("line")}
              className={`px-3 py-2 text-sm ${
                tab === "line"
                  ? "border-b-2 border-brand-500 text-brand-600"
                  : "text-slate-500"
              }`}
            >
              批量粘贴
            </button>
            <button
              onClick={() => setTab("form")}
              className={`px-3 py-2 text-sm ${
                tab === "form"
                  ? "border-b-2 border-brand-500 text-brand-600"
                  : "text-slate-500"
              }`}
            >
              单个表单
            </button>
          </div>
        </div>

        <div className="p-5">
          {tab === "line" ? (
            <>
              <p className="mb-2 text-xs text-slate-500">
                每行一个账号，格式：
                <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">
                  email----password----client_id----refresh_token
                </code>
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="user@outlook.com----pwd----xxxx----yyyy"
                className="w-full rounded-md border border-slate-200 p-3 font-mono text-xs focus:border-brand-500 focus:outline-none"
              />
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Email *" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="密码" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Field
                label="Client ID *"
                value={form.clientId}
                onChange={(v) => setForm({ ...form, clientId: v })}
              />
              <Field
                label="Refresh Token *"
                value={form.refreshToken}
                onChange={(v) => setForm({ ...form, refreshToken: v })}
              />
              <div className="sm:col-span-2">
                <Field label="备注" value={form.remark} onChange={(v) => setForm({ ...form, remark: v })} />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={tab === "line" ? submitLines : submitForm}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}
