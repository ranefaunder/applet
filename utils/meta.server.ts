import type { BunRequest } from "bun";
import { resolveStaticRootFromUrl } from "/utils/static.server";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from "/i18n/languages";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";
import type { Language } from "/types/i18n-types";
import { escapeHtmlAttribute, metaPlainForHtmlAttribute, metaPlainForTitleElement } from "/utils/sanitize.server";

function ogLocale(lang: Language): string {
  const map: Record<Language, string> = {
    fi: "fi_FI", en: "en_US", sv: "sv_SE", zh: "zh_CN", es: "es_ES",
    ja: "ja_JP", de: "de_DE", fr: "fr_FR", hi: "hi_IN", ko: "ko_KR",
    it: "it_IT", pt: "pt_BR", nl: "nl_NL",
  };
  return map[lang];
}

export async function getMeta(req: BunRequest): Promise<string> {
  const lang = getLang(req.url) ?? DEFAULT_LANGUAGE;
  const { origin, pathname } = new URL(req.url);
  const staticRoot = resolveStaticRootFromUrl(req.url);

  const title = metaPlainForTitleElement(t("Appliet — Apply it.", lang));
  const description = metaPlainForHtmlAttribute(
    t("Build personal apps for your needs. Describe what you need — Appliet builds it in minutes.", lang),
  );
  const ogImage = `${staticRoot}/favicons/android-chrome-512x512.png`;

  return /*html*/ `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${ogLocale(lang)}" />
    <meta property="og:url" content="${escapeHtmlAttribute(origin + pathname)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${escapeHtmlAttribute(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <link rel="icon" href="${escapeHtmlAttribute(`${staticRoot}/favicons/favicon.ico`)}" />
    ${Object.keys(AVAILABLE_LANGUAGES).map((code) => {
      const rest = pathname.replace(/^\/[^/]+/, "") || "/";
      return `<link rel="alternate" hreflang="${code}" href="${escapeHtmlAttribute(`${origin}/${code}${rest === "/" ? "/" : rest}`)}" />`;
    }).join("\n    ")}
    <link rel="alternate" hreflang="x-default" href="${escapeHtmlAttribute(`${origin}/${DEFAULT_LANGUAGE}/`)}" />
  `;
}

export type ClientMeta = Record<string, string>;

export async function getClientMeta(req: Pick<Request, "url">): Promise<ClientMeta> {
  const lang = getLang(req.url) ?? DEFAULT_LANGUAGE;
  const title = metaPlainForTitleElement(t("Appliet — Apply it.", lang));
  const description = metaPlainForHtmlAttribute(
    t("Build personal apps for your needs. Describe what you need — Appliet builds it in minutes.", lang),
  );
  return {
    title,
    description,
    "og:title": title,
    "og:description": description,
  };
}
