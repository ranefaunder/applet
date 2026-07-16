const PREVIEW_EMOJIS = ["📱", "✨", "🎯", "📋", "🧩", "⚡", "🎨", "🔧", "📊", "🎮"];

const PREVIEW_GRADIENTS = [
  "linear-gradient(145deg, var(--primary-400), var(--primary-700))",
  "linear-gradient(145deg, oklch(72% 0.14 230), oklch(52% 0.16 260))",
  "linear-gradient(145deg, oklch(78% 0.12 160), oklch(58% 0.14 190))",
  "linear-gradient(145deg, oklch(75% 0.13 330), oklch(55% 0.15 350))",
  "linear-gradient(145deg, oklch(74% 0.12 55), oklch(58% 0.14 35))",
];

function accentIndex(slug: string, count: number): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % count;
}

export function previewEmoji(slug: string): string {
  return PREVIEW_EMOJIS[accentIndex(slug, PREVIEW_EMOJIS.length)] ?? "📱";
}

export function previewGradient(slug: string): string {
  return PREVIEW_GRADIENTS[accentIndex(slug, PREVIEW_GRADIENTS.length)] ?? PREVIEW_GRADIENTS[0]!;
}
