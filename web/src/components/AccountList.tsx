import type { Account } from "../types";

type Props = {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

export function AccountList({ accounts, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">邮箱账号</div>
          <div className="text-xs text-slate-400">本地存储 · 共 {accounts.length} 个</div>
        </div>
        <button
          onClick={onAdd}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + 添加
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            还没有账号，点击右上角添加
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <li
                key={acc.id}
                className={`group flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50 ${
                  selectedId === acc.id ? "bg-brand-50" : ""
                }`}
                onClick={() => onSelect(acc.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {acc.email}
                  </div>
                  {acc.remark && (
                    <div className="truncate text-xs text-slate-400">{acc.remark}</div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`删除账号 ${acc.email}?`)) onRemove(acc.id);
                  }}
                  className="ml-2 hidden text-xs text-slate-400 hover:text-red-500 group-hover:block"
                  title="删除"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
