import type { BunRequest } from "bun";
import { AVAILABLE_LANGUAGES } from "/i18n/languages";
import { isNumericAppSlug } from "/server/database/queries/apps";
import { shortAppPage } from "/server/routes/app-page";

/**
 * Single-segment path:
 * - /452352 → app runtime (numeric public id)
 * - /fi → /fi/ (language redirect)
 */
export default function redirectRoute(req: BunRequest<"/:lang">) {
  const segment = req.params.lang;

  if (segment && isNumericAppSlug(segment)) {
    return shortAppPage(req);
  }

  const url = new URL(req.url);
  if (segment && segment in AVAILABLE_LANGUAGES) {
    return Response.redirect(`${url.origin}/${segment}/${url.search}`, 302);
  }

  return new Response("Not Found", { status: 404 });
}
