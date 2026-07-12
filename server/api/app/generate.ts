import type { BunRequest } from "bun";
import { withAuth } from "/utils/auth.server";
import { apiError, apiSuccess } from "/utils/api.server";
import { dbCreateApp, dbExistsAppSlug } from "/server/database/queries/apps";
import { generateAppConfig } from "/utils/ai-apps.server";
import { apiErrorFromAi } from "/utils/ai-api.server";
import type { Language } from "/types/i18n-types";
import { t } from "/utils/i18n";
import { checkRateLimit } from "/utils/rate-limit.server";
import { getClientIP } from "/utils/request.server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "app";
}

function uniqueSlug(base: string): string {
  let slug = slugify(base);
  let i = 0;
  while (dbExistsAppSlug(slug)) {
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
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

      const b = body as { prompt?: string; language?: string };
      const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
      const language = (b.language || "en") as Language;

      if (!prompt || prompt.length > 2000) {
        return apiError({
          code: "INVALID_PROMPT",
          message: t("Describe your app in a few words.", language),
        });
      }

      const clientIP = getClientIP(req);
      if (!checkRateLimit(clientIP, "app_generate", 20, 60)) {
        return apiError({
          code: "RATE_LIMIT_EXCEEDED",
          message: t("Too many requests. Wait a moment before retrying.", language),
          status: 429,
        });
      }

      let config;
      try {
        config = await generateAppConfig(prompt, language);
      } catch (err) {
        const aiError = apiErrorFromAi(err, language);
        if (aiError) return aiError;
        throw err;
      }
      if (!config) {
        return apiError({
          code: "GENERATION_FAILED",
          message: t("Could not create app. Try again.", language),
          status: 500,
        });
      }

      const id = crypto.randomUUID();
      const slug = uniqueSlug(config.title);

      dbCreateApp({
        id,
        ownerId: user.id,
        title: config.title,
        description: config.description,
        slug,
        configJson: JSON.stringify(config),
      });

      return apiSuccess({
        data: { id, slug, title: config.title },
        status: 201,
      });
    });
  },
};
