import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbGetAppBySlug, dbUpdateApp } from "/server/database/queries/apps";
import { dbAddAppMessage, dbListAppMessages } from "/server/database/queries/app-messages";
import {
  addCost,
  classifyEditIntent,
  editAppConfig,
  generateAppConfig,
  generateAppName,
} from "/utils/ai-apps.server";
import { generateAppIcon } from "/utils/ai-app-icons.server";
import { apiErrorFromAi } from "/utils/ai-api.server";
import { resolveEditAiModel } from "/utils/ai-core.server";
import { DEFAULT_EDIT_AI_MODEL, isEditAiModelKey, resolveStoredModelRef } from "/utils/ai-models";
import {
  isDraftConfig,
  parseAppConfig,
  type AppConfig,
  type AppDetail,
  type AppEditToolUsage,
} from "/types/app-config-types";
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

      let nextConfig: AppConfig = current;
      let assistantReply: string;
      let needsNewIcon = false;
      let costUsd: number | null = null;
      let modelUsed: string | null = null;
      const usage: AppEditToolUsage[] = [];
      const replyParts: string[] = [];

      if (creating) {
        const started = Date.now();
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
        usage.push({
          tool: "generate",
          modelKey: generated.modelUsed,
          costUsd: generated.costUsd,
          durationMs: Date.now() - started,
        });
        assistantReply = t("I built \"$title\" for you. Open the app or tell me what to change.", {
          title: generated.config.title,
        }, language);
        needsNewIcon = true;
      } else {
        const history = dbListAppMessages(row.id);
        const intentModel = resolveEditAiModel("gpt-mini");
        const intentStarted = Date.now();
        let intent;
        try {
          intent = await classifyEditIntent({
            current,
            history,
            instruction: message,
            language,
            model: intentModel,
          });
        } catch (err) {
          const aiError = apiErrorFromAi(err, language);
          if (aiError) return aiError;
          throw err;
        }
        if (!intent) {
          return apiError({
            code: "GENERATION_FAILED",
            message: t("Could not update app. Try again.", language),
            status: 500,
          });
        }

        usage.push({
          tool: "intent",
          modelKey: intent.modelUsed,
          costUsd: intent.costUsd,
          durationMs: Date.now() - intentStarted,
        });
        costUsd = intent.costUsd;
        modelUsed = intent.modelUsed;
        const { tools } = intent;

        if (tools.includes("updateCode")) {
          let result;
          try {
            result = await editAppConfig({
              current: nextConfig,
              history,
              instruction: message,
              language,
              model,
            });
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
          costUsd = addCost(costUsd, result.costUsd);
          modelUsed = result.modelUsed ?? modelUsed;
          for (const step of result.usageSteps) {
            usage.push({
              tool: step.tool,
              modelKey: step.modelUsed,
              costUsd: step.costUsd,
              durationMs: step.durationMs,
            });
          }
          replyParts.push(result.summary);
        }

        if (tools.includes("rename")) {
          const started = Date.now();
          let renamed;
          try {
            renamed = await generateAppName({
              current: nextConfig,
              instruction: message,
              language,
              model,
            });
          } catch (err) {
            const aiError = apiErrorFromAi(err, language);
            if (aiError) return aiError;
            throw err;
          }
          if (!renamed) {
            return apiError({
              code: "GENERATION_FAILED",
              message: t("Could not update app. Try again.", language),
              status: 500,
            });
          }
          nextConfig = {
            ...nextConfig,
            title: renamed.title,
            description: renamed.description,
          };
          costUsd = addCost(costUsd, renamed.costUsd);
          modelUsed = renamed.modelUsed ?? modelUsed;
          usage.push({
            tool: "rename",
            modelKey: renamed.modelUsed,
            costUsd: renamed.costUsd,
            durationMs: Date.now() - started,
          });
          replyParts.push(renamed.summary);
        }

        needsNewIcon = tools.includes("regenerateIcon") && Boolean(row.icon_id);

        if (tools.length === 0) {
          assistantReply = intent.reply;
        } else if (replyParts.length > 0) {
          assistantReply = replyParts.join("\n\n");
        } else {
          assistantReply = intent.reply;
        }
      }

      const durationMs = usage.reduce((sum, u) => sum + (u.durationMs ?? 0), 0);
      const storedModelRef = resolveStoredModelRef({ requestedKey: modelKey, modelUsed });

      let iconId: string | null | undefined;
      let iconModelKey: string | null = null;
      let iconCostUsd: number | null = null;
      let iconDurationMs: number | null = null;
      if (needsNewIcon) {
        const iconResult = await generateAppIcon({
          title: nextConfig.title,
          description: nextConfig.description,
          clientIP,
        });
        if (iconResult) {
          iconId = iconResult.iconId;
          iconModelKey = iconResult.model;
          iconCostUsd = iconResult.costUsd;
          iconDurationMs = iconResult.durationMs;
          usage.push({
            tool: "regenerateIcon",
            modelKey: iconResult.model,
            costUsd: iconResult.costUsd,
            durationMs: iconResult.durationMs,
          });
          assistantReply = `${assistantReply}\n\n${t("I updated the app icon.", language)}`;
        } else {
          assistantReply = `${assistantReply}\n\n${t("I couldn't update the app icon right now. Try again in a moment.", language)}`;
        }
      }

      const configChanged =
        creating ||
        nextConfig.code !== current.code ||
        nextConfig.title !== current.title ||
        nextConfig.description !== current.description ||
        Boolean(iconId);

      if (configChanged) {
        dbUpdateApp(row.id, {
          title: nextConfig.title,
          description: nextConfig.description,
          configJson: JSON.stringify(nextConfig),
          isDraft: creating ? false : undefined,
          ...(iconId ? { iconId } : {}),
        });
      }

      dbAddAppMessage({ id: crypto.randomUUID(), appId: row.id, role: "user", content: message });
      dbAddAppMessage({
        id: crypto.randomUUID(),
        appId: row.id,
        role: "assistant",
        content: assistantReply,
        modelKey: storedModelRef,
        costUsd,
        durationMs,
        iconModelKey,
        iconCostUsd,
        iconDurationMs,
        usage,
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
