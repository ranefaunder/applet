const PREVIEW_GRADIENTS = [
  "linear-gradient(145deg, var(--primary-400), var(--primary-700))",
  "linear-gradient(145deg, oklch(72% 0.14 230), oklch(52% 0.16 260))",
  "linear-gradient(145deg, oklch(78% 0.12 160), oklch(58% 0.14 190))",
  "linear-gradient(145deg, oklch(75% 0.13 330), oklch(55% 0.15 350))",
  "linear-gradient(145deg, oklch(74% 0.12 55), oklch(58% 0.14 35))",
];

const DRAFT_COLORS = [
  "oklch(65% 0.18 25)",
  "oklch(62% 0.16 145)",
  "oklch(60% 0.18 250)",
  "oklch(64% 0.17 310)",
  "oklch(68% 0.14 85)",
  "oklch(58% 0.16 200)",
  "oklch(63% 0.18 35)",
  "oklch(60% 0.14 280)",
];

function accentIndex(slug: string, count: number): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % count;
}

/** Fallback fill when no AI icon yet. */
export function previewGradient(slug: string): string {
  return PREVIEW_GRADIENTS[accentIndex(slug, PREVIEW_GRADIENTS.length)] ?? PREVIEW_GRADIENTS[0]!;
}

export function draftAccentColor(slug: string): string {
  return DRAFT_COLORS[accentIndex(slug, DRAFT_COLORS.length)] ?? DRAFT_COLORS[0]!;
}

export function draftLetter(title: string): string {
  const letter = title.trim().charAt(0).toUpperCase();
  return letter || "?";
}
