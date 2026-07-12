import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { dbAddAppMessage, dbListAppMessages } from "/server/database/queries/app-messages";
import { editAppConfig } from "/utils/ai-apps.server";
import { apiErrorFromAi } from "/utils/ai-api.server";
import { isDraftConfig, parseAppConfig, type AppDetail } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { checkRateLimit } from "/utils/rate-limit.server";
import { getClientIP } from "/utils/request.server";

export default {
  async POST(req: BunRequest) {
    return withAuth(req, async (user) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiError({ code: "INVALID_JSON" });
      }

      const b = body as { slug?: string; message?: string };
      const slug = typeof b.slug === "string" ? b.slug.trim() : "";
      const message = typeof b.message === "string" ? b.message.trim() : "";
      const language = (getLang(req.url) ?? "en") as Language;

      if (!slug) return apiError({ code: "SLUG_REQUIRED" });
      if (!message || message.length > 2000) {
        return apiError({
          code: "INVALID_PROMPT",
          message: t("Describe the change you want.", language),
        });
      }

      const row = dbGetAppBySlug(slug);
      if (!row) return apiError({ code: "NOT_FOUND", status: 404 });
      if (row.owner_id !== user.id) return apiError({ code: "FORBIDDEN", status: 403 });

      const current = parseAppConfig(row.config_json);
      if (!current || isDraftConfig(current)) {
        return apiError({ code: "APP_NOT_READY", status: 409 });
      }

      const clientIP = getClientIP(req);
      if (!checkRateLimit(clientIP, "app_edit", 40, 60)) {
        return apiError({
          code: "RATE_LIMIT_EXCEEDED",
          message: t("Too many requests. Wait a moment before retrying.", language),
          status: 429,
        });
      }

      const history = dbListAppMessages(row.id);

      let result;
      try {
        result = await editAppConfig({ current, history, instruction: message, language });
      } catch (err) {
        const aiError = apiErrorFromAi(err, language);
        if (aiError) return aiError;
        throw err;
      }
      if (!result) {
        return apiError({
          code: "GENERATION_FAILED",
          message: t("Could not update app. Try again.", language),
          status: 500,
        });
      }

      dbUpdateApp(row.id, {
        title: result.config.title,
        description: result.config.description,
        configJson: JSON.stringify(result.config),
      });

      dbAddAppMessage({ id: crypto.randomUUID(), appId: row.id, role: "user", content: message });
      dbAddAppMessage({ id: crypto.randomUUID(), appId: row.id, role: "assistant", content: result.summary });

      const updated = dbGetAppBySlug(slug)!;
      const detail: AppDetail = {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        description: updated.description,
        visibility: updated.visibility,
        ownerId: updated.owner_id,
        config: result.config,
        canEdit: true,
      };

      return apiSuccess({ data: { app: detail, messages: dbListAppMessages(row.id) } });
    });
  },
};
