export type AppVisibility = "private" | "public";

export interface AppRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  slug: string;
  visibility: AppVisibility;
  sourceAppId: string | null;
  configJson: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AppSummary {
  id: string;
  title: string;
  description: string;
  slug: string;
  visibility: AppVisibility;
  ownerId: string;
  ownerNickname: string | null;
  remixCount: number;
  updatedAt: string;
  isDraft: boolean;
  /** Launcher icon reference under /static/app-icons/ (e.g. "abc123.svg"; legacy ids map to .webp) */
  iconId: string | null;
}
