import { mkdirSync } from "fs";
import { z } from "zod";
import { OPENROUTER_CONFIG, requestJsonFromAi } from "/utils/ai-core.server";
import { checkRateLimit } from "/utils/rate-limit.server";

const IMAGE_API_URL = "https://openrouter.ai/api/v1/images";
const IMAGE_MODEL = "google/gemini-3.1-flash-lite-image";
const IMAGE_DIR = "./static/app-icons";
const IMAGE_QUALITY = 88;
const IMAGE_RATE_LIMIT_MAX = 30;
const IMAGE_RATE_LIMIT_WINDOW_MINUTES = 1440;

/** Hard constraints the image model must follow (not left to Gemini). */
const IMAGE_FORMAT_RULES = `Technical requirements (mandatory):
- Exact square image with sharp 90° corners.
- Fully opaque: every pixel painted. No transparency, no alpha, no cutouts.
- Full-bleed artwork to all four edges.
- Do NOT draw rounded corners, squircles, soft edge masks, circular crops, phone frames, or icon bezels.
- No watermarks, other brand logos, UI screenshots, or device mockups.
- Must stay clear and recognizable as a small iPhone home-screen app icon (~60pt / ~120px).`;

const iconBriefSchema = z.object({
  /** Concrete subject: what object/scene/symbol appears in the icon. */
  subject: z.string().min(1),
  /** Art direction: illustrative, soft 3D, flat geometric, painterly, etc. */
  style: z.string().min(1),
  /** Opaque background fill described precisely (color + any gradient). */
  background: z.string().min(1),
  /** Primary / secondary / accent colors with approximate hues. */
  colors: z.string().min(1),
  /** Layout: centered, perspective, scale, negative space. */
  composition: z.string().min(1),
  /** Materials, lighting, shadows, texture. */
  materialsAndLighting: z.string().min(1),
  /** Emotional tone: playful, calm, energetic, premium, etc. */
  mood: z.string().min(1),
  /** Things the image model must not do for this app. */
  avoid: z.string().min(1),
  /**
   * Self-contained image-generation prompt that describes the finished icon
   * in vivid, concrete visual detail (as if briefing a product illustrator).
   */
  renderPrompt: z.string().min(80),
});

type IconBrief = z.infer<typeof iconBriefSchema>;

export async function generateAppIcon(opts: {
  title: string;
  description: string;
  clientIP: string;
}): Promise<string | null> {
  try {
    if (!checkRateLimit(opts.clientIP, "app_icon", IMAGE_RATE_LIMIT_MAX, IMAGE_RATE_LIMIT_WINDOW_MINUTES)) {
      console.warn("App icon generation rate limited");
      return null;
    }

    const brief = await designIconBrief(opts.title, opts.description);
    if (!brief) {
      console.error("App icon brief generation failed");
      return null;
    }

    const prompt = buildImagePrompt(brief);
    const b64 = await fetchImageFromOpenRouter(prompt);
    if (!b64) return null;

    const imageBuffer = Buffer.from(b64, "base64");
    const optimized = await optimizeIcon(imageBuffer);
    const iconId = crypto.randomUUID().replace(/-/g, "").substring(0, 12);

    mkdirSync(IMAGE_DIR, { recursive: true });
    await Bun.write(`${IMAGE_DIR}/${iconId}.webp`, optimized);
    return iconId;
  } catch (error) {
    console.error("Error generating app icon:", error);
    return null;
  }
}

async function designIconBrief(title: string, description: string): Promise<IconBrief | null> {
  const systemPrompt = `You design app icons. Given an app, decide the best icon for it — subject, style, colors, composition, materials, lighting, mood — entirely based on what fits this app.

One hard constraint: the icon must work as a small iPhone home-screen app icon — still clear and recognizable at ~60pt (~120px). Design with that scale in mind.

Write a precise visual brief for an image model that will render your decision literally. Be specific enough that the image model does not need to invent the concept. Put the full renderable description in renderPrompt.`;

  const userPrompt = `App name: ${title.trim() || "Personal app"}
What it does: ${description.trim() || "(no description)"}

Decide the icon for this app and return JSON with: subject, style, background, colors, composition, materialsAndLighting, mood, avoid, renderPrompt.`;

  const { data } = await requestJsonFromAi({
    systemPrompt,
    userPrompt,
    schema: iconBriefSchema,
  });
  return data;
}

function buildImagePrompt(brief: IconBrief): string {
  return [
    "Render this app icon exactly as specified. Follow the brief — do not redesign the concept.",
    "",
    brief.renderPrompt.trim(),
    "",
    "Design brief (follow precisely):",
    `Subject: ${brief.subject}`,
    `Style: ${brief.style}`,
    `Background: ${brief.background}`,
    `Colors: ${brief.colors}`,
    `Composition: ${brief.composition}`,
    `Materials & lighting: ${brief.materialsAndLighting}`,
    `Mood: ${brief.mood}`,
    `Avoid: ${brief.avoid}`,
    "",
    IMAGE_FORMAT_RULES,
  ].join("\n");
}

async function fetchImageFromOpenRouter(prompt: string): Promise<string | null> {
  const response = await fetch(IMAGE_API_URL, {
    method: "POST",
    headers: OPENROUTER_CONFIG.headers,
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      aspect_ratio: "1:1",
      resolution: "1K",
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("OpenRouter images error:", response.status, text.slice(0, 400));
    return null;
  }

  const data = (await response.json()) as {
    error?: { message?: string };
    data?: Array<{ b64_json?: string }>;
  };

  if (data.error) {
    console.error("OpenRouter images API error:", data.error.message);
    return null;
  }

  const b64 = data.data?.[0]?.b64_json;
  return typeof b64 === "string" && b64.length > 0 ? b64 : null;
}

async function optimizeIcon(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = await import("sharp");
    return await sharp
      .default(imageBuffer)
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();
  } catch {
    return imageBuffer;
  }
}
