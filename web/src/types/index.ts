export type Account = {
  id: string;
  email: string;
  password: string;
  clientId: string;
  refreshToken: string;
  remark?: string;
  createdAt: number;
};

export type EmailItem = {
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  body_html?: string;
  has_attachments: boolean;
  folder: string;
};

export type FetchEmailsResponse = {
  email: string;
  folder: string;
  total_in_folder: number;
  fetched: number;
  emails: EmailItem[];
};

export type Folder = "INBOX" | "Junk" | "all";
