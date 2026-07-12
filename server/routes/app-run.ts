import type { BunRequest } from "bun";
import { AVAILABLE_LANGUAGES } from "/i18n/languages";
import { dbGetAppBySlug } from "/server/database/queries/apps";
import { getAuthenticatedUser } from "/utils/auth.server";
import { escapeHtmlAttribute, escapeHtmlTextContent } from "/utils/sanitize.server";
import { isDraftConfig, parseAppConfig } from "/types/app-config-types";

type AppRunRequest = BunRequest<"/:lang/app/:slug/run"> | BunRequest<"/:lang/app/:slug/run.js">;

function getAuthorizedRunApp(req: AppRunRequest) {
  const lang = req.params.lang;
  if (!lang || !(lang in AVAILABLE_LANGUAGES)) return { error: 404 as const };

  const slug = req.params.slug?.trim();
  if (!slug) return { error: 404 as const };

  const row = dbGetAppBySlug(slug);
  if (!row) return { error: 404 as const };

  const user = getAuthenticatedUser(req);
  const isOwner = user?.id === row.owner_id;
  const isPublic = row.visibility === "public";
  if (!isOwner && !isPublic) return { error: 403 as const };

  const config = parseAppConfig(row.config_json);
  if (!config || isDraftConfig(config)) return { error: 404 as const };

  return { lang, slug, row, config };
}

export function appRunHtml(req: AppRunRequest): Response {
  const result = getAuthorizedRunApp(req);
  if ("error" in result) {
    return new Response("Not Found", { status: result.error });
  }

  const { lang, slug, row, config } = result;
  const moduleUrl = `/${lang}/app/${slug}/run.js`;

  const html = `<!doctype html>
<html lang="${escapeHtmlAttribute(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtmlTextContent(row.title)}</title>
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; min-height: 100dvh; }
      body {
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: #171717;
        background: #fff;
      }
    </style>
  </head>
  <body>
    <${config.tagName}></${config.tagName}>
    <script type="module" src="${escapeHtmlAttribute(moduleUrl)}"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function appRunModule(req: AppRunRequest): Response {
  const result = getAuthorizedRunApp(req);
  if ("error" in result) {
    return new Response("// Not found", { status: result.error });
  }

  return new Response(result.config.code, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
