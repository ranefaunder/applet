import { z } from "zod";

/**
 * Appliet-app on kokonainen Web Component (custom element).
 * Tekoäly tuottaa `code`-kentässä täyden JS:n, joka rekisteröi elementin
 * `customElements.define(tagName, ...)` -kutsulla. Komponentti hoitaa oman
 * tilansa ja tallennuksensa itse (localStorage / IndexedDB).
 */
export const appConfigSchema = z.object({
  version: z.literal(2),
  status: z.enum(["ready", "draft", "error"]),
  prompt: z.string(),
  title: z.string().min(1),
  description: z.string(),
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
};

export type AppEditRole = "user" | "assistant";

export type AppEditMessage = {
  id: string;
  role: AppEditRole;
  content: string;
  createdAt: string;
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
