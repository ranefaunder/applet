import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbCreateApp, dbGenerateAppSlug } from "/server/database/queries/apps";
import { dbAddAppMessage } from "/server/database/queries/app-messages";
import type { AppConfig } from "/types/app-config-types";
import type { Language } from "/types/i18n-types";
import { t } from "/utils/i18n";
import { checkRateLimit } from "/utils/rate-limit.server";
import { getClientIP } from "/utils/request.server";

function buildEmptyDraftConfig(title: string): AppConfig {
  return {
    version: 2,
    status: "draft",
    prompt: "",
    title,
    description: "",
    tagName: "applet-draft",
    code: "// draft",
  };
}

/** Creates an empty draft app with a welcome chat message, then client opens the editor. */
export default {
  async POST(req: BunRequest) {
    return withAuth(req, async (user) => {
      let body: unknown = {};
      try {
        body = await req.json();
      } catch {
        // empty body is fine
      }

      const b = body as { language?: string };
      const language = (b.language || "en") as Language;

      const clientIP = getClientIP(req);
      if (!checkRateLimit(clientIP, "app_generate", 20, 60)) {
        return apiError({
          code: "RATE_LIMIT_EXCEEDED",
          message: t("Too many requests. Wait a moment before retrying.", language),
          status: 429,
        });
      }

      const title = t("New App", language);
      const config = buildEmptyDraftConfig(title);
      const id = crypto.randomUUID();
      const slug = dbGenerateAppSlug();

      dbCreateApp({
        id,
        ownerId: user.id,
        title: config.title,
        description: config.description,
        slug,
        configJson: JSON.stringify(config),
        isDraft: true,
      });

      dbAddAppMessage({
        id: crypto.randomUUID(),
        appId: id,
        role: "assistant",
        content: t(
          "Hi! I'm Applet — I'll help you build a personal app.\n\nDescribe what you need in plain language, for example:\n• a habit tracker\n• a wine journal\n• a packing list for camping\n• a tip calculator\n• a reading list\n\nSmall, personal tools work best — trackers, journals, checklists, calculators, and simple one-off utilities.\n\nWhat would you like to build?",
          language,
        ),
      });

      return apiSuccess({
        data: { id, slug, title: config.title, isDraft: true },
        status: 201,
      });
    });
  },
};
