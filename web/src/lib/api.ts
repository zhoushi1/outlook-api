import type { Account, FetchEmailsResponse, Folder } from "../types";

const BASE = "/api/v1";

export async function fetchEmails(
  account: Account,
  folder: Folder,
  count: number,
  bodyLimit = 50000,
  signal?: AbortSignal
): Promise<FetchEmailsResponse> {
  const resp = await fetch(`${BASE}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      email: account.email,
      client_id: account.clientId,
      refresh_token: account.refreshToken,
      folder,
      count,
      body_limit: bodyLimit,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`拉取失败 (${resp.status}): ${detail}`);
  }
  return resp.json();
}
