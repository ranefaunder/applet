import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError } from "/utils/api.server";
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

export type EditStreamEvent =
  | { type: "progress"; text: string; steps?: string[]; index?: number }
  | {
      type: "done";
      data: { app: AppDetail; messages: ReturnType<typeof dbListAppMessages> };
    }
  | { type: "error"; error: { code: string; message?: string }; status?: number };

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

function ndjsonResponse(run: (send: (event: EditStreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: EditStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await run(send);
      } catch (err) {
        console.error("Edit stream failed:", err);
        send({
          type: "error",
          error: { code: "GENERATION_FAILED", message: "Could not update app. Try again." },
          status: 500,
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function sendAiError(send: (e: EditStreamEvent) => void, res: Response, language: Language) {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
      status?: number;
    };
    send({
      type: "error",
      error: {
        code: body.error?.code ?? "GENERATION_FAILED",
        message: body.error?.message ?? t("Could not update app. Try again.", language),
      },
      status: body.status ?? res.status,
    });
  } catch {
    send({
      type: "error",
      error: { code: "GENERATION_FAILED", message: t("Could not update app. Try again.", language) },
      status: 500,
    });
  }
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

      // Stream progress + final result so the chat can show live status from intent.
      return ndjsonResponse(async (send) => {
        let nextConfig: AppConfig = current;
        let assistantReply: string;
        let needsNewIcon = false;
        let costUsd: number | null = null;
        let modelUsed: string | null = null;
        const usage: AppEditToolUsage[] = [];
        const replyParts: string[] = [];

        if (creating) {
          const createSteps = [
            t("Building your app…", language),
            t("Designing the home-screen icon…", language),
          ];
          send({ type: "progress", text: createSteps[0]!, steps: createSteps, index: 0 });

          const started = Date.now();
          let generated;
          try {
            generated = await generateAppConfig(message, language, model);
          } catch (err) {
            const aiError = apiErrorFromAi(err, language);
            if (aiError) {
              await sendAiError(send, aiError, language);
              return;
            }
            throw err;
          }
          if (!generated) {
            send({
              type: "error",
              error: {
                code: "GENERATION_FAILED",
                message: t("Could not create app. Try again.", language),
              },
              status: 500,
            });
            return;
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
          send({ type: "progress", text: createSteps[1]!, steps: createSteps, index: 1 });
        } else {
          send({
            type: "progress",
            text: t("Figuring out what you need…", language),
          });

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
            if (aiError) {
              await sendAiError(send, aiError, language);
              return;
            }
            throw err;
          }
          if (!intent) {
            send({
              type: "error",
              error: {
                code: "GENERATION_FAILED",
                message: t("Could not update app. Try again.", language),
              },
              status: 500,
            });
            return;
          }

          usage.push({
            tool: "intent",
            modelKey: intent.modelUsed,
            costUsd: intent.costUsd,
            durationMs: Date.now() - intentStarted,
          });
          costUsd = intent.costUsd;
          modelUsed = intent.modelUsed;
          const { tools, progress } = intent;

          const steps = progress.length > 0 ? progress : [t("Working on your app…", language)];
          let stepIndex = 0;
          const emitStep = (text?: string) => {
            const line = text ?? steps[Math.min(stepIndex, steps.length - 1)]!;
            send({ type: "progress", text: line, steps, index: Math.min(stepIndex, steps.length - 1) });
            stepIndex++;
          };
          emitStep();

          if (tools.includes("updateCode")) {
            emitStep();
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
              if (aiError) {
                await sendAiError(send, aiError, language);
                return;
              }
              throw err;
            }
            if (!result) {
              send({
                type: "error",
                error: {
                  code: "GENERATION_FAILED",
                  message: t("Could not update app. Try again.", language),
                },
                status: 500,
              });
              return;
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
            emitStep();
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
              if (aiError) {
                await sendAiError(send, aiError, language);
                return;
              }
              throw err;
            }
            if (!renamed) {
              send({
                type: "error",
                error: {
                  code: "GENERATION_FAILED",
                  message: t("Could not update app. Try again.", language),
                },
                status: 500,
              });
              return;
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
          if (needsNewIcon) emitStep();

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
          if (creating) {
            // already advanced to icon step above
          }
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
        send({
          type: "done",
          data: {
            app: toDetail(updated, nextConfig),
            messages: dbListAppMessages(row.id),
          },
        });
      });
    });
  },
};
