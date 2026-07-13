/**
 * Staattisten tiedostojen juuri pyyntö-URL:sta (dev: sama origin kuin sivulla).
 * Tuotanto: CDN.
 */
export function resolveStaticRootFromUrl(reqUrl: string): string {
  if (process.env.NODE_ENV === "production") {
    return "https://applet.b-cdn.net";
  }
  return `${new URL(reqUrl).origin}/static`;
}
