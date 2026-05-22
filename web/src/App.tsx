import { useEffect, useState } from "react";
import { AccountList } from "./components/AccountList";
import { AddAccountDialog } from "./components/AddAccountDialog";
import { MailView } from "./components/MailView";
import { loadAccounts, saveAccounts } from "./lib/storage";
import type { Account } from "./types";

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const list = loadAccounts();
    setAccounts(list);
    if (list.length > 0) setSelectedId(list[0].id);
  }, []);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const onAdd = (newOnes: Account[]) => {
    const merged = [...accounts];
    for (const a of newOnes) {
      const idx = merged.findIndex((x) => x.email === a.email);
      if (idx >= 0) merged[idx] = a;
      else merged.push(a);
    }
    setAccounts(merged);
    if (!selectedId && newOnes.length > 0) setSelectedId(newOnes[0].id);
  };

  const onRemove = (id: string) => {
    setAccounts((cur) => cur.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex h-screen w-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
            M
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Outlook 邮箱取件</div>
            <div className="text-[11px] text-slate-400">本地存储 · 不上传账号信息</div>
          </div>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-slate-500 hover:text-brand-600"
        >
          API 文档
        </a>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AccountList
          accounts={accounts}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={onRemove}
          onAdd={() => setDialogOpen(true)}
        />
        <MailView account={selected} />
      </div>
      <AddAccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={onAdd}
      />
    </div>
  );
}
