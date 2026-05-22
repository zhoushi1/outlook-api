import type { Account } from "../types";

const KEY = "outlook-mail.accounts.v1";

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(KEY, JSON.stringify(accounts));
}

export function parseTokenLine(line: string): Omit<Account, "id" | "createdAt"> | null {
  const parts = line.trim().split("----").map((p) => p.trim());
  if (parts.length < 4) return null;
  const [email, password, clientId, refreshToken, ...rest] = parts;
  if (!email || !clientId || !refreshToken) return null;
  return {
    email,
    password,
    clientId,
    refreshToken,
    remark: rest.join("----") || undefined,
  };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
