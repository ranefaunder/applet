import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { isDraftConfig, parseAppConfig, type AppDetail } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";

/** Move a ready draft into My Applets (is_draft = 0). */
export default {
  async POST(req: BunRequest) {
    return withAuth(req, async (user) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiError({ code: "INVALID_JSON" });
      }

      const slug = typeof (body as { slug?: string }).slug === "string"
        ? (body as { slug: string }).slug.trim()
        : "";
      const language = (getLang(req.url) ?? "en") as Language;

      if (!slug) return apiError({ code: "SLUG_REQUIRED" });

      const row = dbGetAppBySlug(slug);
      if (!row) return apiError({ code: "NOT_FOUND", status: 404 });
      if (row.owner_id !== user.id) return apiError({ code: "FORBIDDEN", status: 403 });

      const config = parseAppConfig(row.config_json);
      if (!config || isDraftConfig(config)) {
        return apiError({
          code: "APP_NOT_READY",
          message: t("Finish building the app before adding it to My Applets.", language),
          status: 409,
        });
      }

      dbUpdateApp(row.id, { isDraft: false });

      const updated = dbGetAppBySlug(slug)!;
      const detail: AppDetail = {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        description: updated.description,
        visibility: updated.visibility,
        ownerId: updated.owner_id,
        config,
        canEdit: true,
        isDraft: false,
      };

      return apiSuccess({ data: { app: detail } });
    });
  },
};
