import type { BunRequest } from "bun";
import type { InitialConfig, SsrContext } from "/types/ssr-types";
import type { AuthenticatedUser } from "/types/user-types";
import type { Language } from "/types/i18n-types";
import type { AppDetail } from "/types/app-config-types";
import { getAuthenticatedUser } from "/utils/auth.server";
import { canViewApp } from "/utils/app-access.server";
import { getLang } from "/utils/lang";
import { resolveStaticRootFromUrl } from "/utils/static.server";
import { translations } from "/i18n/translations";
import { dbListUserApps, dbGetAppBySlug } from "/server/database/queries/apps";
import { parseAppConfig } from "/types/app-config-types";

export function createSsrContext(req: BunRequest): SsrContext {
  const language = getLang(req.url) ?? "en";
  const initialUser = getAuthenticatedUser(req);
  return {
    language,
    initialConfig: getInitialConfig(req),
    initialUser,
    initialTranslations: getInitialTranslations(language),
    initialApps: getInitialApps(req, initialUser),
    initialApp: getInitialApp(req, initialUser),
  };
}

function getInitialConfig(req: BunRequest): InitialConfig {
  return { staticRoot: resolveStaticRootFromUrl(req.url) };
}

function getInitialApp(req: BunRequest, user: AuthenticatedUser | null): AppDetail | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  if (parts[1] !== "app" || !parts[2]) return null;

  const slug = parts[2];
  const row = dbGetAppBySlug(slug);
  if (!row) return null;

  const config = parseAppConfig(row.config_json);
  if (!config) return null;

  if (!canViewApp(row, user?.id ?? null)) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    ownerId: row.owner_id,
    config,
    canEdit: user?.id === row.owner_id,
  };
}

function getInitialApps(req: BunRequest, initialUser: AuthenticatedUser | null) {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const segment = parts[1];

  if (segment === "apps" && initialUser) {
    return dbListUserApps(initialUser.id);
  }
  return undefined;
}

function getInitialTranslations(lang: Language): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = Object.keys(translations) as (keyof typeof translations)[];
  for (const key of keys) {
    const val = translations[key];
    if (val && typeof val === "object" && "serverOnly" in val && (val as { serverOnly?: boolean }).serverOnly) continue;
    result[key] = lang === "en" ? key : (val?.[lang] ?? key);
  }
  return result;
}
