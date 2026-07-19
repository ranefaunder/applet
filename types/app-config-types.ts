import { z } from "zod";

/**
 * Abblet-app on kokonainen Web Component (custom element).
 * Tekoäly tuottaa `code`-kentässä täyden JS:n, joka rekisteröi elementin
 * `customElements.define(tagName, ...)` -kutsulla. Komponentti hoitaa oman
 * tilansa ja tallennuksensa itse (localStorage / IndexedDB).
 */
export const appConfigSchema = z.object({
  version: z.literal(2),
  status: z.enum(["ready", "draft", "error"]),
  prompt: z.string(),
  /**
   * Launcher label. New apps are generated with max 12 chars; longer values
   * may exist on older apps and are accepted when loading.
   */
  title: z.string().min(1).max(80),
  description: z.string(),
  /** @deprecated Launcher uses AI-generated icon files; kept for older configs. */
  emoji: z.string().max(8).optional(),
  /** Custom element -nimi, esim. "run-log". Pakollinen väliviiva. */
  tagName: z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/),
  /** Täysi JS, joka rekisteröi custom elementin. Vanilla JS, ei importteja. */
  code: z.string().min(1),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export type AppDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility: "private" | "public";
  ownerId: string;
  config: AppConfig;
  canEdit: boolean;
  /** @deprecated Draft placement removed; always false for new apps. */
  isDraft: boolean;
  /** Launcher icon reference under /static/app-icons/ (e.g. "abc123.svg"; legacy ids map to .webp) */
  iconId: string | null;
};

export type AppEditRole = "user" | "assistant";

export type AppEditMessage = {
  id: string;
  role: AppEditRole;
  content: string;
  createdAt: string;
  /** Edit-picker model key / OpenRouter id used for this assistant reply, if any. */
  modelKey?: string | null;
  /** OpenRouter usage cost in USD for the text edit reply, if any. */
  costUsd?: number | null;
  /** Wall time for the text AI request in ms, if any. */
  durationMs?: number | null;
  /** Image model used for launcher icon generation in this reply, if any. */
  iconModelKey?: string | null;
  /** Combined icon brief + image cost in USD, if any. */
  iconCostUsd?: number | null;
  /** Wall time for icon generation in ms, if any. */
  iconDurationMs?: number | null;
};

export function parseAppConfig(json: string): AppConfig | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    const result = appConfigSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Luonnos: ei vielä generoitua komponenttikoodia. */
export function isDraftConfig(config: AppConfig | null): boolean {
  return config == null || config.status !== "ready" || !config.code;
}
