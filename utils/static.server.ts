/**
 * Staattisten tiedostojen juuri pyyntö-URL:sta (dev: sama origin kuin sivulla).
 * Tuotanto: CDN (applet.faunder.fi).
 */
export function resolveStaticRootFromUrl(reqUrl: string): string {
  if (process.env.NODE_ENV === "production") {
    return "https://applet.faunder.fi/static";
  }
  return `${new URL(reqUrl).origin}/static`;
}
