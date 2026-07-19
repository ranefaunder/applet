import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { dbAddAppMessage, dbListAppMessages } from "/server/database/queries/app-messages";
import { generateAppIcon } from "/utils/ai-app-icons.server";
import { isDraftConfig, parseAppConfig, type AppDetail } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { getClientIP } from "/utils/request.server";

/** Regenerate the launcher icon on explicit user request (button in the editor). */
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
        return apiError({ code: "APP_NOT_READY", status: 409 });
      }

      const iconResult = await generateAppIcon({
        title: config.title,
        description: config.description,
        clientIP: getClientIP(req),
      });
      if (!iconResult) {
        return apiError({
          code: "ICON_GENERATION_FAILED",
          message: t("Could not generate the app icon. Try again.", language),
          status: 502,
        });
      }

      dbUpdateApp(row.id, { iconId: iconResult.iconId });

      dbAddAppMessage({
        id: crypto.randomUUID(),
        appId: row.id,
        role: "assistant",
        content: t("I updated the app icon.", language),
        iconModelKey: iconResult.model,
        iconCostUsd: iconResult.costUsd,
        iconDurationMs: iconResult.durationMs,
      });

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
        isDraft: updated.is_draft === 1,
        iconId: updated.icon_id ?? null,
      };

      return apiSuccess({
        data: {
          app: detail,
          messages: dbListAppMessages(row.id),
        },
      });
    });
  },
};
