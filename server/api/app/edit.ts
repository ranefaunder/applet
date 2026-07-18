import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { dbAddAppMessage, dbListAppMessages } from "/server/database/queries/app-messages";
import { editAppConfig, generateAppConfig } from "/utils/ai-apps.server";
import { generateAppIcon } from "/utils/ai-app-icons.server";
import { apiErrorFromAi } from "/utils/ai-api.server";
import { resolveEditAiModel } from "/utils/ai-core.server";
import { DEFAULT_EDIT_AI_MODEL, isEditAiModelKey, resolveStoredModelRef } from "/utils/ai-models";
import { isDraftConfig, parseAppConfig, type AppConfig, type AppDetail } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { getLang } from "/utils/lang";
import { t } from "/utils/i18n";
import { checkRateLimit } from "/utils/rate-limit.server";
import { getClientIP } from "/utils/request.server";

function toDetail(
  row: NonNullable<ReturnType<typeof dbGetAppBySlug>>,
  config: AppConfig,
): AppDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    ownerId: row.owner_id,
    config,
    canEdit: true,
    isDraft: row.is_draft === 1,
    iconId: row.icon_id ?? null,
  };
}

export default {
  async POST(req: BunRequest) {
    return withAuth(req, async (user) => {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return apiError({ code: "INVALID_JSON" });
      }

      const b = body as { slug?: string; message?: string; model?: string };
      const slug = typeof b.slug === "string" ? b.slug.trim() : "";
      const message = typeof b.message === "string" ? b.message.trim() : "";
      const language = (getLang(req.url) ?? "en") as Language;
      const modelKey = b.model == null || b.model === ""
        ? DEFAULT_EDIT_AI_MODEL
        : isEditAiModelKey(b.model)
          ? b.model
          : null;
      if (!modelKey) {
        return apiError({ code: "INVALID_MODEL", message: t("Invalid AI model.", language) });
      }
      const model = resolveEditAiModel(modelKey);

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
      if (!current) {
        return apiError({ code: "APP_NOT_READY", status: 409 });
      }

      const clientIP = getClientIP(req);
      const creating = isDraftConfig(current);
      if (!checkRateLimit(clientIP, creating ? "app_generate" : "app_edit", creating ? 20 : 40, 60)) {
        return apiError({
          code: "RATE_LIMIT_EXCEEDED",
          message: t("Too many requests. Wait a moment before retrying.", language),
          status: 429,
        });
      }

      let nextConfig: AppConfig;
      let assistantReply: string;
      let needsNewIcon = false;
      let costUsd: number | null = null;
      let modelUsed: string | null = null;
      const aiStartedAt = Date.now();

      if (creating) {
        let generated;
        try {
          generated = await generateAppConfig(message, language, model);
        } catch (err) {
          const aiError = apiErrorFromAi(err, language);
          if (aiError) return aiError;
          throw err;
        }
        if (!generated) {
          return apiError({
            code: "GENERATION_FAILED",
            message: t("Could not create app. Try again.", language),
            status: 500,
          });
        }
        nextConfig = generated.config;
        costUsd = generated.costUsd;
        modelUsed = generated.modelUsed;
        assistantReply = t("I built \"$title\" for you. Open the app or tell me what to change.", {
          title: generated.config.title,
        }, language);
        // First launcher icon is created only on "Add to My Apps".
      } else {
        const history = dbListAppMessages(row.id);
        let result;
        try {
          result = await editAppConfig({ current, history, instruction: message, language, model });
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
        nextConfig = result.config;
        costUsd = result.costUsd;
        modelUsed = result.modelUsed;
        assistantReply = result.summary;
        // Icon change only when the model flags it, and only if a launcher icon already exists.
        needsNewIcon = Boolean(row.icon_id) && result.needsNewIcon;
      }

      const durationMs = Date.now() - aiStartedAt;
      const storedModelRef = resolveStoredModelRef({ requestedKey: modelKey, modelUsed });

      let iconId: string | null | undefined;
      if (needsNewIcon) {
        iconId = await generateAppIcon({
          title: nextConfig.title,
          description: nextConfig.description,
          clientIP,
        });
        if (iconId) {
          assistantReply = `${assistantReply}\n\n${t("I updated the app icon.", language)}`;
        } else {
          assistantReply = `${assistantReply}\n\n${t("I couldn't update the app icon right now. Try again in a moment.", language)}`;
        }
      }

      dbUpdateApp(row.id, {
        title: nextConfig.title,
        description: nextConfig.description,
        configJson: JSON.stringify(nextConfig),
        // Stay in Drafts on the home screen after first build.
        isDraft: creating ? true : undefined,
        ...(iconId ? { iconId } : {}),
      });

      dbAddAppMessage({ id: crypto.randomUUID(), appId: row.id, role: "user", content: message });
      dbAddAppMessage({
        id: crypto.randomUUID(),
        appId: row.id,
        role: "assistant",
        content: assistantReply,
        modelKey: storedModelRef,
        costUsd,
        durationMs,
      });

      const updated = dbGetAppBySlug(slug)!;
      return apiSuccess({
        data: {
          app: toDetail(updated, nextConfig),
          messages: dbListAppMessages(row.id),
        },
      });
    });
  },
};
