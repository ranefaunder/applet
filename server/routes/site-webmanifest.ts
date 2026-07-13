import type { BunRequest } from "bun";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from "/i18n/languages";
import { t } from "/utils/i18n";
import { getLang } from "/utils/lang";

export default async function (req: BunRequest): Promise<Response> {
  const lang = getLang(req.url) ?? DEFAULT_LANGUAGE;
  const manifest = {
    name: t("Applet — Apply it.", lang),
    short_name: "Applet",
    description: t("Build personal apps for your needs. Describe what you need — Applet builds it in minutes.", lang),
    start_url: `/${lang}/`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang,
    icons: [],
  };
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
