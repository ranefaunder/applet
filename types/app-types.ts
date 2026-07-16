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
  /** File id under /static/app-icons/{iconId}.webp */
  iconId: string | null;
}
