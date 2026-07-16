import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { isDraftConfig, parseAppConfig, type AppConfig, type AppDetail } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";

export default {
  async POST(req: BunRequest) {
    return withAuth(req, async (user) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiError({ code: "INVALID_JSON" });
      }

      const b = body as { slug?: string; code?: string };
      const slug = typeof b.slug === "string" ? b.slug.trim() : "";
      const code = typeof b.code === "string" ? b.code : "";
      const language = (getLang(req.url) ?? "en") as Language;

      if (!slug) return apiError({ code: "SLUG_REQUIRED" });
      if (!code.trim()) return apiError({ code: "CODE_REQUIRED" });

      const row = dbGetAppBySlug(slug);
      if (!row) return apiError({ code: "NOT_FOUND", status: 404 });
      if (row.owner_id !== user.id) return apiError({ code: "FORBIDDEN", status: 403 });

      const current = parseAppConfig(row.config_json);
      if (!current || isDraftConfig(current)) {
        return apiError({ code: "APP_NOT_READY", status: 409 });
      }

      if (!code.includes(current.tagName)) {
        return apiError({
          code: "INVALID_CODE",
          message: t("Code must still register <$tag>.", { tag: current.tagName }, language),
        });
      }

      const config: AppConfig = { ...current, status: "ready", code };

      dbUpdateApp(row.id, { configJson: JSON.stringify(config) });

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

      return apiSuccess({ data: { app: detail } });
    });
  },
};
