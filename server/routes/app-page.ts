import type { BunRequest } from "bun";
import { AVAILABLE_LANGUAGES } from "/i18n/languages";
import type { Language } from "/i18n/languages";
import { dbGetAppBySlug } from "/server/database/queries/apps";
import { getAuthenticatedUser } from "/utils/auth.server";
import { canViewApp } from "/utils/app-access.server";
import { escapeHtmlAttribute, escapeHtmlTextContent } from "/utils/sanitize.server";
import { isDraftConfig, parseAppConfig } from "/types/app-config-types";

type AppPageRequest = BunRequest<"/:lang/app/:slug">;

type AppModuleRequest =
  | BunRequest<"/:lang/app/:slug/module.js">
  | BunRequest<"/:lang/app/:slug/run.js">;

type AppRunRedirectRequest = BunRequest<"/:lang/app/:slug/run">;

type AppAccess =
  | { kind: "ready"; lang: Language; slug: string; title: string; tagName: string }
  | { kind: "building"; lang: Language; slug: string; title: string }
  | { kind: "error"; status: number };

const BUILDING_COPY: Record<Language, { building: string; buildingHint: string }> = {
  en: { building: "Applying your idea…", buildingHint: "AI is building your applet." },
  fi: { building: "Toteutetaan ideaasi…", buildingHint: "Tekoäly rakentaa appletiasi." },
  sv: { building: "Tillämpar din idé…", buildingHint: "AI bygger din applet." },
  zh: { building: "Applying your idea…", buildingHint: "AI is building your applet." },
  es: { building: "Aplicando tu idea…", buildingHint: "La IA está creando tu applet." },
  ja: { building: "Applying your idea…", buildingHint: "AI is building your applet." },
  de: { building: "Idee wird umgesetzt…", buildingHint: "KI erstellt deine Applet." },
  fr: { building: "Application de votre idée…", buildingHint: "L'IA construit votre applet." },
  hi: { building: "Applying your idea…", buildingHint: "AI is building your applet." },
  ko: { building: "Applying your idea…", buildingHint: "AI is building your applet." },
  it: { building: "Applicazione dell'idea…", buildingHint: "L'IA sta costruendo l'applet." },
  pt: { building: "A aplicar a sua ideia…", buildingHint: "A IA está a construir o applet." },
  nl: { building: "Idee wordt toegepast…", buildingHint: "AI bouwt je applet." },
};

function buildingCopy(lang: Language) {
  return BUILDING_COPY[lang] ?? BUILDING_COPY.en;
}

function resolveAppAccess(req: AppPageRequest): AppAccess {
  const lang = req.params.lang as Language;
  if (!lang || !(lang in AVAILABLE_LANGUAGES)) return { kind: "error", status: 404 };

  const slug = req.params.slug?.trim();
  if (!slug) return { kind: "error", status: 404 };

  const row = dbGetAppBySlug(slug);
  if (!row) return { kind: "error", status: 404 };

  const user = getAuthenticatedUser(req);
  if (!canViewApp(row, user?.id ?? null)) return { kind: "error", status: 403 };

  const config = parseAppConfig(row.config_json);
  const isOwner = user?.id === row.owner_id;
  if (!config || isDraftConfig(config)) {
    if (!isOwner) return { kind: "error", status: 404 };
    return { kind: "building", lang, slug, title: row.title };
  }

  return {
    kind: "ready",
    lang,
    slug,
    title: row.title,
    tagName: config.tagName,
  };
}

function getReadyApp(req: { params: { lang?: string; slug?: string }; url: string }) {
  const lang = req.params.lang as Language;
  if (!lang || !(lang in AVAILABLE_LANGUAGES)) return { error: 404 as const };

  const slug = req.params.slug?.trim();
  if (!slug) return { error: 404 as const };

  const row = dbGetAppBySlug(slug);
  if (!row) return { error: 404 as const };

  const user = getAuthenticatedUser(req as BunRequest);
  if (!canViewApp(row, user?.id ?? null)) return { error: 403 as const };

  const config = parseAppConfig(row.config_json);
  if (!config || isDraftConfig(config)) return { error: 404 as const };

  return { lang, slug, config };
}

const PAGE_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, "SF Pro Text", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #f2f2f7;
    color: #000;
  }
  .main {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .main > :first-child { display: block; flex: 1; min-height: 100%; }
  .state {
    flex: 1;
    display: grid;
    place-content: center;
    text-align: center;
    padding: 48px 24px;
    color: #6e6e73;
  }
  .state p { margin: 0; }
  .state .hint { margin-top: 8px; font-size: 14px; }
`;

export function appPage(req: AppPageRequest): Response {
  const access = resolveAppAccess(req);

  if (access.kind === "error") {
    return new Response("Not Found", { status: access.status });
  }

  if (access.kind === "building") {
    const copy = buildingCopy(access.lang);
    const html = `<!doctype html>
<html lang="${escapeHtmlAttribute(access.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtmlTextContent(access.title)}</title>
    <style>${PAGE_STYLES}</style>
  </head>
  <body>
    <main class="main">
      <div class="state">
        <p>${escapeHtmlTextContent(copy.building)}</p>
        <p class="hint">${escapeHtmlTextContent(copy.buildingHint)}</p>
      </div>
    </main>
    <script>
      (async function () {
        try {
          const res = await fetch("/api/${escapeHtmlAttribute(access.lang)}/app/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ slug: ${JSON.stringify(access.slug)} }),
          });
          const data = await res.json();
          if (data.success) location.reload();
          else document.querySelector(".state").innerHTML = "<p>" + (data.error?.message || "Error") + "</p>";
        } catch (e) {
          document.querySelector(".state").innerHTML = "<p>Error</p>";
        }
      })();
    </script>
  </body>
</html>`;
    return htmlResponse(html);
  }

  const moduleUrl = `/${access.lang}/app/${access.slug}/module.js`;

  const html = `<!doctype html>
<html lang="${escapeHtmlAttribute(access.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtmlTextContent(access.title)}</title>
    <style>${PAGE_STYLES}</style>
  </head>
  <body>
    <main class="main" id="mount"></main>
    <script type="module">
      const tag = ${JSON.stringify(access.tagName)};
      const mount = document.getElementById("mount");
      await import(${JSON.stringify(moduleUrl)});
      mount.appendChild(document.createElement(tag));
    </script>
  </body>
</html>`;

  return htmlResponse(html);
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function appRunRedirect(req: AppRunRedirectRequest): Response {
  const lang = req.params.lang;
  const slug = req.params.slug?.trim();
  if (!lang || !(lang in AVAILABLE_LANGUAGES) || !slug) {
    return new Response("Not Found", { status: 404 });
  }
  const url = new URL(req.url);
  return Response.redirect(`${url.origin}/${lang}/app/${slug}${url.search}`, 302);
}

export function appModule(req: AppModuleRequest): Response {
  const result = getReadyApp(req);
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
